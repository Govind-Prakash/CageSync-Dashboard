-- 0007_role_based_write_policies.sql
-- Splits the per-table "any non-observer can write anything" rule into a
-- conservative ladder:
--   observer / facility_vet / facility_manager : read only (no write)
--   technician                                 : INSERT + UPDATE (no DELETE)
--   researcher / lab_manager / pi              : INSERT + UPDATE + DELETE
--
-- Cross-lab isolation, SELECT scoping, and profile/lab/lab_invites
-- policies are NOT changed by this migration.

-- ============================================================================
-- 1. Helper predicates
-- ============================================================================

CREATE OR REPLACE FUNCTION public.my_role_can_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.my_role() IN (
    'technician'::public.user_role,
    'researcher'::public.user_role,
    'lab_manager'::public.user_role,
    'pi'::public.user_role
  )
$$;

CREATE OR REPLACE FUNCTION public.my_role_can_delete()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.my_role() IN (
    'researcher'::public.user_role,
    'lab_manager'::public.user_role,
    'pi'::public.user_role
  )
$$;

GRANT EXECUTE ON FUNCTION public.my_role_can_write()  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_role_can_delete() TO anon, authenticated;

-- ============================================================================
-- 2. Lab-scoped entity tables — drop combined policy, add split policies
--    Pattern is identical for each table; differences are only the name.
-- ============================================================================

-- CAGES ----------------------------------------------------------------------
DROP POLICY IF EXISTS "cages_write_lab_non_observer" ON public.cages;
CREATE POLICY "cages_insert_lab" ON public.cages
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "cages_update_lab" ON public.cages
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "cages_delete_lab" ON public.cages
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- ANIMALS --------------------------------------------------------------------
DROP POLICY IF EXISTS "animals_write_lab_non_observer" ON public.animals;
CREATE POLICY "animals_insert_lab" ON public.animals
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "animals_update_lab" ON public.animals
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "animals_delete_lab" ON public.animals
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- TREATMENTS -----------------------------------------------------------------
DROP POLICY IF EXISTS "treatments_write_lab_non_observer" ON public.treatments;
CREATE POLICY "treatments_insert_lab" ON public.treatments
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "treatments_update_lab" ON public.treatments
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "treatments_delete_lab" ON public.treatments
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- LITTERS --------------------------------------------------------------------
DROP POLICY IF EXISTS "litters_write_lab_non_observer" ON public.litters;
CREATE POLICY "litters_insert_lab" ON public.litters
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "litters_update_lab" ON public.litters
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "litters_delete_lab" ON public.litters
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- RECORDS --------------------------------------------------------------------
DROP POLICY IF EXISTS "records_write_lab_non_observer" ON public.records;
CREATE POLICY "records_insert_lab" ON public.records
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "records_update_lab" ON public.records
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "records_delete_lab" ON public.records
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- OBSERVATIONS ---------------------------------------------------------------
DROP POLICY IF EXISTS "observations_write_lab_non_observer" ON public.observations;
CREATE POLICY "observations_insert_lab" ON public.observations
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "observations_update_lab" ON public.observations
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "observations_delete_lab" ON public.observations
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- BREEDING_PAIRS -------------------------------------------------------------
DROP POLICY IF EXISTS "breeding_pairs_write_lab_non_observer" ON public.breeding_pairs;
CREATE POLICY "breeding_pairs_insert_lab" ON public.breeding_pairs
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "breeding_pairs_update_lab" ON public.breeding_pairs
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "breeding_pairs_delete_lab" ON public.breeding_pairs
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- EXPERIMENTS ----------------------------------------------------------------
DROP POLICY IF EXISTS "experiments_write_lab_non_observer" ON public.experiments;
CREATE POLICY "experiments_insert_lab" ON public.experiments
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "experiments_update_lab" ON public.experiments
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "experiments_delete_lab" ON public.experiments
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- ROOMS ----------------------------------------------------------------------
DROP POLICY IF EXISTS "rooms_write_lab_non_observer" ON public.rooms;
CREATE POLICY "rooms_insert_lab" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "rooms_update_lab" ON public.rooms
  FOR UPDATE TO authenticated
  USING      (lab_id = public.my_lab_id() AND public.my_role_can_write())
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role_can_write());
CREATE POLICY "rooms_delete_lab" ON public.rooms
  FOR DELETE TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role_can_delete());

-- ============================================================================
-- 3. experiment_animals — junction table, scopes via parent experiment's lab
-- ============================================================================
DROP POLICY IF EXISTS "experiment_animals_write_lab_non_observer" ON public.experiment_animals;

CREATE POLICY "experiment_animals_insert_lab" ON public.experiment_animals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.my_role_can_write()
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  );

CREATE POLICY "experiment_animals_update_lab" ON public.experiment_animals
  FOR UPDATE TO authenticated
  USING (
    public.my_role_can_write()
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  )
  WITH CHECK (
    public.my_role_can_write()
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  );

CREATE POLICY "experiment_animals_delete_lab" ON public.experiment_animals
  FOR DELETE TO authenticated
  USING (
    public.my_role_can_delete()
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  );
