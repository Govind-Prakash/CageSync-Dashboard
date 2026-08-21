-- 0027_observations_insert_facility_staff.sql
-- Workstream V-1: Extend observations INSERT to facility overseers.
--
-- Observations are welfare data — clinical notes on individual
-- animals (weight, condition, behavior, vet exam findings). Their
-- authoritative writer is the attending vet, not just lab members.
-- Currently the INSERT policy is `can_write_lab(lab_id)` which
-- excludes facility staff even after the mutual-consent
-- affiliation is active.
--
-- This relax makes facility vets + facility managers first-class
-- writers on observations for any lab they've been affiliated to
-- via lab_facility_affiliations (status='active', enforced
-- transitively through is_facility_overseer_of_lab).
--
-- Idempotent.

DROP POLICY IF EXISTS "observations_insert_lab"              ON public.observations;
DROP POLICY IF EXISTS "observations_insert_lab_or_facility"  ON public.observations;

CREATE POLICY "observations_insert_lab_or_facility" ON public.observations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_write_lab(lab_id)
    OR public.is_facility_overseer_of_lab(lab_id)
  );
