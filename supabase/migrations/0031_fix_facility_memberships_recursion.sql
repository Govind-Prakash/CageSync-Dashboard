-- 0031_fix_facility_memberships_recursion.sql
-- Bug fix: RLS on facility_memberships (shipped in 0010) evaluates
-- an `EXISTS (SELECT ... FROM facility_memberships fm ...)`
-- subquery that goes back through the same policy → infinite
-- recursion (Postgres 42P17). Client hits it the moment they
-- SELECT anything, e.g. ProfileService.currentFacilityMemberships.
--
-- Fix pattern: replace the self-referencing EXISTS with a
-- SECURITY DEFINER helper (role_in_facility from 0025) that reads
-- facility_memberships with RLS bypassed. Same semantics, no
-- recursion.
--
-- Idempotent.

DROP POLICY IF EXISTS "facility_memberships_select"        ON public.facility_memberships;
DROP POLICY IF EXISTS "facility_memberships_write_manager" ON public.facility_memberships;

-- SELECT: your own row, plus any row in a facility where you are
-- a member (any role). role_in_facility returns NULL when the
-- caller isn't a member, non-null otherwise — matches the
-- previous "facility peer" semantic without touching the table
-- from inside its own policy.
CREATE POLICY "facility_memberships_select" ON public.facility_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.role_in_facility(facility_id) IS NOT NULL
  );

-- Writes: facility_manager of the facility only. Same DEFINER
-- helper — the role check happens inside role_in_facility which
-- bypasses RLS via SECURITY DEFINER.
CREATE POLICY "facility_memberships_write_manager" ON public.facility_memberships
  FOR ALL TO authenticated
  USING (
    public.role_in_facility(facility_id) = 'facility_manager'::public.user_role
  )
  WITH CHECK (
    public.role_in_facility(facility_id) = 'facility_manager'::public.user_role
  );
