-- 0026_lab_facility_affiliations.sql
-- Workstream III-2: mutual-consent affiliation between a lab and a
-- facility. Replaces the top-down `labs.facility_id` model (where a
-- facility silently oversaw every lab that happened to point at it)
-- with an explicit many-to-many table that requires BOTH sides to
-- opt in.
--
-- `labs.facility_id` is kept as "physical location" (where the lab
-- literally sits — a lab can be at HUJI Ein Karem building even if
-- it isn't overseen by that facility's vet team). Oversight now
-- flows through this table.
--
-- Ships:
--   * lab_facility_affiliations table + RLS
--   * request_facility_affiliation / accept_facility_affiliation
--     / revoke_facility_affiliation SECURITY DEFINER RPCs
--   * is_facility_overseer_of_lab rewritten to check active
--     affiliations (breaking-change to any code that relied on the
--     old labs.facility_id join — audit shows only the helper
--     itself does that)
--
-- Idempotent.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lab_facility_affiliations (
  lab_id             uuid NOT NULL REFERENCES public.labs(id)       ON DELETE CASCADE,
  facility_id        uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'active', 'revoked')),
  requested_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_by_side  text NOT NULL
                     CHECK (requested_by_side IN ('lab', 'facility')),
  approved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at       timestamptz NOT NULL DEFAULT now(),
  responded_at       timestamptz,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lab_id, facility_id)
);

CREATE INDEX IF NOT EXISTS lfa_facility_status_idx
  ON public.lab_facility_affiliations (facility_id, status);
CREATE INDEX IF NOT EXISTS lfa_lab_status_idx
  ON public.lab_facility_affiliations (lab_id, status);

ALTER TABLE public.lab_facility_affiliations ENABLE ROW LEVEL SECURITY;

-- Read: both sides involved (writers of the lab, and any member of
-- the facility). Everyone else is blocked.
DROP POLICY IF EXISTS "lfa_read_involved" ON public.lab_facility_affiliations;
CREATE POLICY "lfa_read_involved" ON public.lab_facility_affiliations
  FOR SELECT
  TO authenticated
  USING (
    public.can_read_lab(lab_id)
    OR public.role_in_facility(facility_id) IS NOT NULL
  );

-- No direct writes. All mutations go through the SECURITY DEFINER
-- RPCs below so we can enforce the mutual-consent + side-checks in
-- one place.
GRANT SELECT ON public.lab_facility_affiliations TO authenticated;

-- ============================================================
-- 2. Helper — is the caller a lab-side approver?
-- ============================================================
-- "Lab-side approver" = PI or lab_manager of the lab. Technicians +
-- researchers can write cages but shouldn't authorize an outside
-- facility to oversee the whole lab.

CREATE OR REPLACE FUNCTION public.is_lab_approver(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.role_in_lab(p_lab_id) IN (
    'pi'::public.user_role,
    'lab_manager'::public.user_role
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_lab_approver(uuid) TO authenticated;

-- ============================================================
-- 3. request_facility_affiliation
-- ============================================================

CREATE OR REPLACE FUNCTION public.request_facility_affiliation(
  p_lab_id      uuid,
  p_facility_id uuid,
  p_notes       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_side       text;
  v_existing   public.lab_facility_affiliations;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  -- Determine which side the caller is on. Both sides are allowed
  -- to initiate; we just need to record which one did so the
  -- accept RPC can validate the opposite party.
  IF public.is_lab_approver(p_lab_id) THEN
    v_side := 'lab';
  ELSIF public.role_in_facility(p_facility_id) =
        'facility_manager'::public.user_role THEN
    v_side := 'facility';
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authorized',
      'detail', 'Must be lab PI/manager or facility manager.'
    );
  END IF;

  -- Handle existing row: 'pending' or 'active' → reject; 'revoked'
  -- → reset back to pending so relationships can be rebuilt.
  SELECT * INTO v_existing
    FROM public.lab_facility_affiliations
   WHERE lab_id = p_lab_id AND facility_id = p_facility_id;

  IF v_existing IS NOT NULL AND v_existing.status IS NOT NULL THEN
    IF v_existing.status IN ('pending', 'active') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'already_' || v_existing.status
      );
    END IF;

    -- status = 'revoked' — allow re-request.
    UPDATE public.lab_facility_affiliations
       SET status = 'pending',
           requested_by = auth.uid(),
           requested_by_side = v_side,
           approved_by = NULL,
           requested_at = now(),
           responded_at = NULL,
           notes = p_notes,
           updated_at = now()
     WHERE lab_id = p_lab_id AND facility_id = p_facility_id;

    RETURN jsonb_build_object('success', true, 'status', 'pending', 'side', v_side);
  END IF;

  INSERT INTO public.lab_facility_affiliations
    (lab_id, facility_id, status, requested_by, requested_by_side, notes)
  VALUES
    (p_lab_id, p_facility_id, 'pending', auth.uid(), v_side, p_notes);

  RETURN jsonb_build_object('success', true, 'status', 'pending', 'side', v_side);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_facility_affiliation(uuid, uuid, text)
  TO authenticated;

-- ============================================================
-- 4. accept_facility_affiliation — the OPPOSITE side approves
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_facility_affiliation(
  p_lab_id      uuid,
  p_facility_id uuid,
  p_notes       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.lab_facility_affiliations;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  SELECT * INTO v_row
    FROM public.lab_facility_affiliations
   WHERE lab_id = p_lab_id AND facility_id = p_facility_id;

  IF v_row IS NULL OR v_row.status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_requested');
  END IF;

  IF v_row.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_pending', 'status', v_row.status);
  END IF;

  -- Whoever REQUESTED cannot also approve. Facility-requested →
  -- lab approver must accept; lab-requested → facility manager must
  -- accept.
  IF v_row.requested_by_side = 'lab' THEN
    IF public.role_in_facility(p_facility_id) <> 'facility_manager'::public.user_role THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'not_authorized',
        'detail', 'Facility manager must accept a lab-initiated request.'
      );
    END IF;
  ELSE
    -- requested_by_side = 'facility'
    IF NOT public.is_lab_approver(p_lab_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'not_authorized',
        'detail', 'Lab PI/manager must accept a facility-initiated request.'
      );
    END IF;
  END IF;

  UPDATE public.lab_facility_affiliations
     SET status = 'active',
         approved_by = auth.uid(),
         responded_at = now(),
         notes = COALESCE(p_notes, notes),
         updated_at = now()
   WHERE lab_id = p_lab_id AND facility_id = p_facility_id;

  RETURN jsonb_build_object('success', true, 'status', 'active');
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_facility_affiliation(uuid, uuid, text)
  TO authenticated;

-- ============================================================
-- 5. revoke_facility_affiliation — either side can end it
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_facility_affiliation(
  p_lab_id      uuid,
  p_facility_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  IF NOT (
    public.is_lab_approver(p_lab_id)
    OR public.role_in_facility(p_facility_id) =
       'facility_manager'::public.user_role
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;

  UPDATE public.lab_facility_affiliations
     SET status = 'revoked',
         responded_at = now(),
         updated_at = now()
   WHERE lab_id = p_lab_id AND facility_id = p_facility_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'revoked');
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_facility_affiliation(uuid, uuid)
  TO authenticated;

-- ============================================================
-- 6. Rewrite is_facility_overseer_of_lab
-- ============================================================
-- Was: JOIN labs l ON l.facility_id = fm.facility_id
-- Now: JOIN lab_facility_affiliations WHERE status = 'active'
--
-- Only facility_vet + facility_manager count as overseers
-- (facility_technician does not — they're day-to-day ops, not
-- welfare authority).

CREATE OR REPLACE FUNCTION public.is_facility_overseer_of_lab(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.facility_memberships fm
      JOIN public.lab_facility_affiliations lfa
        ON lfa.facility_id = fm.facility_id
     WHERE fm.user_id = auth.uid()
       AND lfa.lab_id = p_lab_id
       AND lfa.status = 'active'
       AND fm.role IN (
         'facility_vet'::public.user_role,
         'facility_manager'::public.user_role
       )
  );
$$;
