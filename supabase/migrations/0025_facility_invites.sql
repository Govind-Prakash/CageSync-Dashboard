-- 0025_facility_invites.sql
-- Workstream III-1: facility staff invites (mirror of lab_invites).
--
-- Ships:
--   * facility_technician value on the user_role enum
--   * facility_invites table + RLS
--   * role_in_facility(p_facility_id) helper (mirrors role_in_lab)
--   * get_pending_facility_invite(p_token) SECURITY DEFINER read-lookup
--   * accept_facility_invite(p_token) SECURITY DEFINER (mirror of
--     accept_invite but writes to facility_memberships)
--   * Extend handle_new_user to also auto-match pending
--     facility_invites by email on signup
--
-- Idempotent. Safe to re-run.

-- ============================================================
-- 1. Enum extension
-- ============================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'facility_technician';

-- ============================================================
-- 2. facility_invites table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facility_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id  uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  invited_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email        text NOT NULL,
  role         public.user_role NOT NULL DEFAULT 'facility_technician'::public.user_role,
  token        text NOT NULL DEFAULT gen_random_uuid()::text,
  accepted     boolean NOT NULL DEFAULT false,
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS facility_invites_email_idx
  ON public.facility_invites (lower(email));
CREATE INDEX IF NOT EXISTS facility_invites_facility_idx
  ON public.facility_invites (facility_id);

ALTER TABLE public.facility_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. role_in_facility helper (mirror of role_in_lab from 0009)
-- ============================================================

CREATE OR REPLACE FUNCTION public.role_in_facility(p_facility_id uuid)
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT fm.role
    FROM public.facility_memberships fm
   WHERE fm.user_id = auth.uid()
     AND fm.facility_id = p_facility_id
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.role_in_facility(uuid) TO anon, authenticated;

-- ============================================================
-- 4. RLS on facility_invites
-- ============================================================

-- Read: facility_manager of the target facility can list invites.
-- Also: the invitee (matched by email) can read their own row via
-- the get_pending_facility_invite SECURITY DEFINER fetch — no
-- SELECT policy is granted to invitees directly (parity with how
-- lab_invites is locked down after 0006).
DROP POLICY IF EXISTS "facility_invites_read_manager" ON public.facility_invites;
CREATE POLICY "facility_invites_read_manager" ON public.facility_invites
  FOR SELECT
  TO authenticated
  USING (
    public.role_in_facility(facility_id) = 'facility_manager'::public.user_role
  );

-- Write: only facility_manager can insert / update / delete.
DROP POLICY IF EXISTS "facility_invites_insert_manager" ON public.facility_invites;
CREATE POLICY "facility_invites_insert_manager" ON public.facility_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.role_in_facility(facility_id) = 'facility_manager'::public.user_role
  );

DROP POLICY IF EXISTS "facility_invites_update_manager" ON public.facility_invites;
CREATE POLICY "facility_invites_update_manager" ON public.facility_invites
  FOR UPDATE TO authenticated
  USING      (public.role_in_facility(facility_id) = 'facility_manager'::public.user_role)
  WITH CHECK (public.role_in_facility(facility_id) = 'facility_manager'::public.user_role);

DROP POLICY IF EXISTS "facility_invites_delete_manager" ON public.facility_invites;
CREATE POLICY "facility_invites_delete_manager" ON public.facility_invites
  FOR DELETE TO authenticated
  USING (
    public.role_in_facility(facility_id) = 'facility_manager'::public.user_role
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_invites TO authenticated;

-- ============================================================
-- 5. get_pending_facility_invite (mirror of get_pending_invite)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pending_facility_invite(p_token text)
RETURNS public.facility_invites
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
    FROM public.facility_invites
   WHERE token = p_token
     AND COALESCE(accepted, false) = false
     AND (expires_at IS NULL OR expires_at > now())
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_facility_invite(text)
  TO anon, authenticated;

-- ============================================================
-- 6. accept_facility_invite (mirror of accept_invite)
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_facility_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_user_email text;
  v_invite     public.facility_invites;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  SELECT * INTO v_invite FROM public.get_pending_facility_invite(p_token);
  IF v_invite IS NULL OR v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired');
  END IF;

  SELECT email INTO v_user_email
    FROM public.profiles WHERE id = v_user_id;

  IF v_user_email IS NULL OR LOWER(v_user_email) <> LOWER(v_invite.email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_mismatch',
      'invite_email', v_invite.email
    );
  END IF;

  INSERT INTO public.facility_memberships (user_id, facility_id, role)
  VALUES (v_user_id, v_invite.facility_id, v_invite.role)
  ON CONFLICT (user_id, facility_id) DO UPDATE
    SET role = EXCLUDED.role;

  UPDATE public.facility_invites
     SET accepted = true
   WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'facility_id', v_invite.facility_id,
    'role', v_invite.role::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_facility_invite(text) TO authenticated;

-- ============================================================
-- 7. Extend handle_new_user to auto-match facility invites too
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite            public.lab_invites;
  v_facility_invite   public.facility_invites;
  v_full_name         text;
  v_lab_name          text;
  v_new_lab_id        uuid;
  v_email_domain      text;
  v_matched_inst_id   uuid;
  v_matched_inst_cnt  int;
BEGIN
  -- (1) Profile.
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- (2) Pending lab invite auto-match.
  IF NEW.email IS NOT NULL THEN
    SELECT * INTO v_invite FROM public.lab_invites
     WHERE LOWER(email) = LOWER(NEW.email)
       AND COALESCE(accepted, false) = false
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
      INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
      VALUES (NEW.id, v_invite.lab_id, v_invite.role, 'invite_signup')
      ON CONFLICT (user_id, lab_id) DO UPDATE
        SET role = EXCLUDED.role, joined_via = EXCLUDED.joined_via;

      UPDATE public.profiles SET lab_id = v_invite.lab_id, role = v_invite.role
       WHERE id = NEW.id;
      UPDATE public.lab_invites SET accepted = true WHERE id = v_invite.id;
    END IF;
  END IF;

  -- (2b) Pending facility invite auto-match. Independent of lab
  -- invites — a user might have BOTH pending (rare) and we honor
  -- the most recent facility one just like we do for labs.
  IF NEW.email IS NOT NULL THEN
    SELECT * INTO v_facility_invite FROM public.facility_invites
     WHERE LOWER(email) = LOWER(NEW.email)
       AND COALESCE(accepted, false) = false
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC LIMIT 1;

    IF v_facility_invite.id IS NOT NULL THEN
      INSERT INTO public.facility_memberships (user_id, facility_id, role)
      VALUES (NEW.id, v_facility_invite.facility_id, v_facility_invite.role)
      ON CONFLICT (user_id, facility_id) DO UPDATE
        SET role = EXCLUDED.role;

      UPDATE public.facility_invites SET accepted = true
       WHERE id = v_facility_invite.id;
    END IF;
  END IF;

  -- (3) Auto-create personal lab if no lab membership resulted from
  -- (2). Facility-only signups skip this — they don't need a lab.
  IF NOT EXISTS (SELECT 1 FROM public.lab_memberships WHERE user_id = NEW.id)
     AND NOT EXISTS (SELECT 1 FROM public.facility_memberships WHERE user_id = NEW.id)
  THEN
    v_full_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'New user'
    );
    v_lab_name := v_full_name || '''s Colony';

    INSERT INTO public.labs (name) VALUES (v_lab_name) RETURNING id INTO v_new_lab_id;
    INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
    VALUES (NEW.id, v_new_lab_id, 'pi'::public.user_role, 'auto_created_personal');
    UPDATE public.profiles SET lab_id = v_new_lab_id, role = 'pi'::public.user_role
     WHERE id = NEW.id;
  END IF;

  -- (4) Institution auto-verify by email domain (unchanged from 0018).
  IF NEW.email IS NOT NULL THEN
    v_email_domain := split_part(NEW.email, '@', 2);
    IF v_email_domain <> '' THEN
      INSERT INTO public.user_institution_verifications (user_id, institution_id, verified_via)
      SELECT NEW.id, i.id, 'email_domain'
        FROM public.institutions i
       WHERE v_email_domain = ANY (i.email_domains)
         AND i.status = 'active'
      ON CONFLICT DO NOTHING;

      IF v_new_lab_id IS NOT NULL THEN
        SELECT count(*), max(i.id) INTO v_matched_inst_cnt, v_matched_inst_id
          FROM public.institutions i
         WHERE v_email_domain = ANY (i.email_domains)
           AND i.status = 'active';

        IF v_matched_inst_cnt = 1 THEN
          UPDATE public.labs SET institution_id = v_matched_inst_id
           WHERE id = v_new_lab_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
