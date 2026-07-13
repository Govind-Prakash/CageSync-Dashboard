-- 0014_auto_create_personal_lab.sql
-- Path A Step 2 (I-2): Every new signup gets a lab from the moment they
-- land on the dashboard — no chooser, no empty state.
--
-- Logic (extends 0012's handle_new_user):
--   1. Create profile.                                    (existing)
--   2. Auto-match a pending invite by email; if found,
--      insert the lab_memberships row and mark accepted.  (existing)
--   3. If (1) and (2) did NOT result in any lab_memberships
--      row for the new user, create a personal lab named
--      "{Full name}'s Colony" and make the user its PI.
--
-- Consequences:
--   * profiles.lab_id is always populated after signup
--     (either the invited lab or the personal one).
--   * Downstream code that assumes "signed-in user has a lab"
--     stops needing null-guards for brand-new users.
--   * Facility overseers (Path B) can safely ignore their
--     personal lab; it's harmless. When facility setup ships
--     they'll create a facility separately from Settings.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite     public.lab_invites;
  v_full_name  text;
  v_lab_name   text;
  v_new_lab_id uuid;
BEGIN
  -- (1) Create profile.
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- (2) Try to attach a pending invite matching this email.
  IF NEW.email IS NOT NULL THEN
    SELECT *
      INTO v_invite
      FROM public.lab_invites
     WHERE LOWER(email) = LOWER(NEW.email)
       AND COALESCE(accepted, false) = false
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
      INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
      VALUES (NEW.id, v_invite.lab_id, v_invite.role, 'invite_signup')
      ON CONFLICT (user_id, lab_id) DO UPDATE
        SET role       = EXCLUDED.role,
            joined_via = EXCLUDED.joined_via;

      UPDATE public.profiles
         SET lab_id = v_invite.lab_id,
             role   = v_invite.role
       WHERE id = NEW.id;

      UPDATE public.lab_invites
         SET accepted = true
       WHERE id = v_invite.id;
    END IF;
  END IF;

  -- (3) Fallback: no invite matched, so give this user a personal lab
  --     so the dashboard is usable immediately. Only runs if step (2)
  --     didn't create a membership.
  IF NOT EXISTS (
    SELECT 1 FROM public.lab_memberships WHERE user_id = NEW.id
  ) THEN
    -- Prefer full_name, fall back to email prefix, then a placeholder.
    v_full_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'New user'
    );

    -- "Alice"'s Colony → "Alice's Colony". Double the single quote to
    -- escape it inside the concatenated literal.
    v_lab_name := v_full_name || '''s Colony';

    INSERT INTO public.labs (name)
    VALUES (v_lab_name)
    RETURNING id INTO v_new_lab_id;

    INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
    VALUES (NEW.id, v_new_lab_id, 'pi'::public.user_role, 'auto_created_personal');

    UPDATE public.profiles
       SET lab_id = v_new_lab_id,
           role   = 'pi'::public.user_role
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
