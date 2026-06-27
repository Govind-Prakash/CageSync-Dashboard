-- 0009_multilab_helpers.sql
-- Helper predicates for the multi-lab membership / facility-oversight
-- model introduced in 0008. All SECURITY DEFINER + STABLE so they're safe
-- to call from RLS USING/WITH CHECK clauses.
--
-- Sub-step 3 will replace the existing `lab_id = my_lab_id()` checks in
-- every entity table with calls to these helpers. Old helpers
-- (`my_lab_id`, `my_role`, `my_role_can_write`, `my_role_can_delete`)
-- are NOT touched here — they keep working until Sub-step 3 lands.

-- ============================================================================
-- Lab-level membership predicates
-- ============================================================================

-- Is the caller a member of the given lab?
CREATE OR REPLACE FUNCTION public.is_lab_member(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lab_memberships
    WHERE user_id = auth.uid()
      AND lab_id  = p_lab_id
  )
$$;

-- The caller's role in a specific lab. NULL if not a member.
CREATE OR REPLACE FUNCTION public.role_in_lab(p_lab_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.lab_memberships
  WHERE user_id = auth.uid()
    AND lab_id  = p_lab_id
  LIMIT 1
$$;

-- ============================================================================
-- Facility-level oversight predicate
-- ============================================================================

-- True if the caller is a facility_vet or facility_manager of the facility
-- that owns the given lab. Used to grant read-only oversight across multiple
-- labs in the same facility without enumerating each lab membership.
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
    JOIN public.labs l ON l.facility_id = fm.facility_id
    WHERE fm.user_id = auth.uid()
      AND l.id       = p_lab_id
      AND fm.role IN (
        'facility_vet'::public.user_role,
        'facility_manager'::public.user_role
      )
  )
$$;

-- ============================================================================
-- Composite access tier predicates (the ones RLS will actually call)
-- ============================================================================

-- READ access: lab member OR facility overseer. Facility overseers get
-- read-only across all labs in their facility — they can audit welfare
-- data without being added to each lab individually.
CREATE OR REPLACE FUNCTION public.can_read_lab(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_lab_member(p_lab_id)
      OR public.is_facility_overseer_of_lab(p_lab_id)
$$;

-- INSERT/UPDATE access: must be a lab member (facility overseers do NOT
-- write to lab data) AND role must be in the writer tier. Matches Step B's
-- conservative ladder, just scoped per-lab now instead of per-active-lab.
CREATE OR REPLACE FUNCTION public.can_write_lab(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.role_in_lab(p_lab_id) IN (
    'technician'::public.user_role,
    'researcher'::public.user_role,
    'lab_manager'::public.user_role,
    'pi'::public.user_role
  )
$$;

-- DELETE access: lab member AND role in the delete tier. Technicians can
-- record but cannot erase; researchers / lab_manager / pi can delete.
CREATE OR REPLACE FUNCTION public.can_delete_lab(p_lab_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.role_in_lab(p_lab_id) IN (
    'researcher'::public.user_role,
    'lab_manager'::public.user_role,
    'pi'::public.user_role
  )
$$;

-- ============================================================================
-- Grants — RLS policies + clients may call these
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_lab_member(uuid)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.role_in_lab(uuid)                 TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_facility_overseer_of_lab(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_lab(uuid)                TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_lab(uuid)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_delete_lab(uuid)              TO anon, authenticated;
