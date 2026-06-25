-- 0003_rls_policies.sql
-- Bootstraps the first lab and assigns govind7x@gmail.com as its PI,
-- then adds RLS policies for every public table so the dashboard
-- can actually read/write under the anon/authenticated key.
--
-- Policy model (v1, intentionally simple):
--   * profiles: user reads/updates own row; same-lab members read each other;
--               PI/lab_manager can update profiles in their lab (role + lab_id).
--   * labs: members read their own lab; PI updates.
--   * rooms/cages/animals/treatments/observations/breeding_pairs/experiments/
--     experiment_animals: read = same lab; write = same lab AND role <> 'observer'.
--   * lab_invites: PI of the lab reads/writes; invitee may read by token.

-- ============================================================================
-- BOOTSTRAP: create the first lab and link the founder profile
-- ============================================================================
DO $$
DECLARE
  v_lab_id uuid;
  v_pi_id  uuid := 'e407997a-1d3d-4229-9d82-0bff99d93c3e';  -- govind7x@gmail.com
BEGIN
  -- Create lab if none exists; otherwise reuse the founder's existing lab.
  SELECT lab_id INTO v_lab_id FROM public.profiles WHERE id = v_pi_id;

  IF v_lab_id IS NULL THEN
    INSERT INTO public.labs (name, institution)
    VALUES ('CageSync Lab', 'IISER Bhopal')
    RETURNING id INTO v_lab_id;

    UPDATE public.profiles
       SET lab_id = v_lab_id,
           role   = 'pi'::public.user_role
     WHERE id = v_pi_id;
  END IF;
END $$;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE POLICY "profiles_select_self_or_lab"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR lab_id = public.my_lab_id());

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_by_pi_or_manager"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    lab_id = public.my_lab_id()
    AND public.my_role() IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  )
  WITH CHECK (
    lab_id = public.my_lab_id()
    AND public.my_role() IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  );

-- ============================================================================
-- LABS
-- ============================================================================
CREATE POLICY "labs_select_member"
  ON public.labs FOR SELECT TO authenticated
  USING (id = public.my_lab_id());

CREATE POLICY "labs_update_pi"
  ON public.labs FOR UPDATE TO authenticated
  USING (id = public.my_lab_id() AND public.my_role() = 'pi'::public.user_role)
  WITH CHECK (id = public.my_lab_id() AND public.my_role() = 'pi'::public.user_role);

CREATE POLICY "labs_insert_authenticated"
  ON public.labs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- ROOMS
-- ============================================================================
CREATE POLICY "rooms_select_lab"
  ON public.rooms FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "rooms_write_lab_non_observer"
  ON public.rooms FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- CAGES
-- ============================================================================
CREATE POLICY "cages_select_lab"
  ON public.cages FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "cages_write_lab_non_observer"
  ON public.cages FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- ANIMALS
-- ============================================================================
CREATE POLICY "animals_select_lab"
  ON public.animals FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "animals_write_lab_non_observer"
  ON public.animals FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- TREATMENTS
-- ============================================================================
CREATE POLICY "treatments_select_lab"
  ON public.treatments FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "treatments_write_lab_non_observer"
  ON public.treatments FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- OBSERVATIONS
-- ============================================================================
CREATE POLICY "observations_select_lab"
  ON public.observations FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "observations_write_lab_non_observer"
  ON public.observations FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- BREEDING PAIRS
-- ============================================================================
CREATE POLICY "breeding_pairs_select_lab"
  ON public.breeding_pairs FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "breeding_pairs_write_lab_non_observer"
  ON public.breeding_pairs FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- EXPERIMENTS
-- ============================================================================
CREATE POLICY "experiments_select_lab"
  ON public.experiments FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "experiments_write_lab_non_observer"
  ON public.experiments FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- EXPERIMENT_ANIMALS (junction table — scoped via parent experiment's lab)
-- ============================================================================
CREATE POLICY "experiment_animals_select_lab"
  ON public.experiment_animals FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.experiments e
     WHERE e.id = experiment_animals.experiment_id
       AND e.lab_id = public.my_lab_id()
  ));

CREATE POLICY "experiment_animals_write_lab_non_observer"
  ON public.experiment_animals FOR ALL TO authenticated
  USING (
    public.my_role() <> 'observer'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  )
  WITH CHECK (
    public.my_role() <> 'observer'::public.user_role
    AND EXISTS (
      SELECT 1 FROM public.experiments e
       WHERE e.id = experiment_animals.experiment_id
         AND e.lab_id = public.my_lab_id()
    )
  );

-- ============================================================================
-- LAB_INVITES (PI manages; invitee may read by token to accept)
-- ============================================================================
CREATE POLICY "lab_invites_select_pi"
  ON public.lab_invites FOR SELECT TO authenticated
  USING (
    lab_id = public.my_lab_id()
    AND public.my_role() IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  );

CREATE POLICY "lab_invites_select_by_token"
  ON public.lab_invites FOR SELECT TO anon, authenticated
  USING (token IS NOT NULL);

CREATE POLICY "lab_invites_write_pi"
  ON public.lab_invites FOR ALL TO authenticated
  USING (
    lab_id = public.my_lab_id()
    AND public.my_role() IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  )
  WITH CHECK (
    lab_id = public.my_lab_id()
    AND public.my_role() IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  );
