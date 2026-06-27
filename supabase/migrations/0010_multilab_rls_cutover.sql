-- 0010_multilab_rls_cutover.sql
-- The moment the multi-lab + facility-oversight access model goes live.
-- Replaces every per-table policy that checked `lab_id = my_lab_id()` with
-- the new helpers from 0009 (can_read_lab / can_write_lab / can_delete_lab),
-- and adds policies for the new membership tables.
--
-- Why this stays safe for existing single-lab users (today: only
-- govind7x@gmail.com):
--   * 0008 backfilled lab_memberships from profiles.lab_id, so anyone
--     who was a member of a lab pre-refactor still is.
--   * profiles.lab_id is unchanged — apps that read it as "active lab"
--     keep getting the same value.
--   * can_read_lab(L) is true if user has a row in lab_memberships(L);
--     all backfilled users do.

-- ============================================================================
-- ENTITY TABLES — drop split policies from Step B, re-add using new helpers
-- ============================================================================

-- CAGES ----------------------------------------------------------------------
DROP POLICY IF EXISTS "cages_select_lab"  ON public.cages;
DROP POLICY IF EXISTS "cages_insert_lab"  ON public.cages;
DROP POLICY IF EXISTS "cages_update_lab"  ON public.cages;
DROP POLICY IF EXISTS "cages_delete_lab"  ON public.cages;
CREATE POLICY "cages_select_lab" ON public.cages FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "cages_insert_lab" ON public.cages FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "cages_update_lab" ON public.cages FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "cages_delete_lab" ON public.cages FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- ANIMALS --------------------------------------------------------------------
DROP POLICY IF EXISTS "animals_select_lab" ON public.animals;
DROP POLICY IF EXISTS "animals_insert_lab" ON public.animals;
DROP POLICY IF EXISTS "animals_update_lab" ON public.animals;
DROP POLICY IF EXISTS "animals_delete_lab" ON public.animals;
CREATE POLICY "animals_select_lab" ON public.animals FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "animals_insert_lab" ON public.animals FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "animals_update_lab" ON public.animals FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "animals_delete_lab" ON public.animals FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- TREATMENTS -----------------------------------------------------------------
DROP POLICY IF EXISTS "treatments_select_lab" ON public.treatments;
DROP POLICY IF EXISTS "treatments_insert_lab" ON public.treatments;
DROP POLICY IF EXISTS "treatments_update_lab" ON public.treatments;
DROP POLICY IF EXISTS "treatments_delete_lab" ON public.treatments;
CREATE POLICY "treatments_select_lab" ON public.treatments FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "treatments_insert_lab" ON public.treatments FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "treatments_update_lab" ON public.treatments FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "treatments_delete_lab" ON public.treatments FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- LITTERS --------------------------------------------------------------------
DROP POLICY IF EXISTS "litters_select_lab" ON public.litters;
DROP POLICY IF EXISTS "litters_insert_lab" ON public.litters;
DROP POLICY IF EXISTS "litters_update_lab" ON public.litters;
DROP POLICY IF EXISTS "litters_delete_lab" ON public.litters;
CREATE POLICY "litters_select_lab" ON public.litters FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "litters_insert_lab" ON public.litters FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "litters_update_lab" ON public.litters FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "litters_delete_lab" ON public.litters FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- RECORDS --------------------------------------------------------------------
DROP POLICY IF EXISTS "records_select_lab" ON public.records;
DROP POLICY IF EXISTS "records_insert_lab" ON public.records;
DROP POLICY IF EXISTS "records_update_lab" ON public.records;
DROP POLICY IF EXISTS "records_delete_lab" ON public.records;
CREATE POLICY "records_select_lab" ON public.records FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "records_insert_lab" ON public.records FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "records_update_lab" ON public.records FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "records_delete_lab" ON public.records FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- OBSERVATIONS ---------------------------------------------------------------
DROP POLICY IF EXISTS "observations_select_lab" ON public.observations;
DROP POLICY IF EXISTS "observations_insert_lab" ON public.observations;
DROP POLICY IF EXISTS "observations_update_lab" ON public.observations;
DROP POLICY IF EXISTS "observations_delete_lab" ON public.observations;
CREATE POLICY "observations_select_lab" ON public.observations FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "observations_insert_lab" ON public.observations FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "observations_update_lab" ON public.observations FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "observations_delete_lab" ON public.observations FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- BREEDING_PAIRS -------------------------------------------------------------
DROP POLICY IF EXISTS "breeding_pairs_select_lab" ON public.breeding_pairs;
DROP POLICY IF EXISTS "breeding_pairs_insert_lab" ON public.breeding_pairs;
DROP POLICY IF EXISTS "breeding_pairs_update_lab" ON public.breeding_pairs;
DROP POLICY IF EXISTS "breeding_pairs_delete_lab" ON public.breeding_pairs;
CREATE POLICY "breeding_pairs_select_lab" ON public.breeding_pairs FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "breeding_pairs_insert_lab" ON public.breeding_pairs FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "breeding_pairs_update_lab" ON public.breeding_pairs FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "breeding_pairs_delete_lab" ON public.breeding_pairs FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- EXPERIMENTS ----------------------------------------------------------------
DROP POLICY IF EXISTS "experiments_select_lab" ON public.experiments;
DROP POLICY IF EXISTS "experiments_insert_lab" ON public.experiments;
DROP POLICY IF EXISTS "experiments_update_lab" ON public.experiments;
DROP POLICY IF EXISTS "experiments_delete_lab" ON public.experiments;
CREATE POLICY "experiments_select_lab" ON public.experiments FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "experiments_insert_lab" ON public.experiments FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "experiments_update_lab" ON public.experiments FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "experiments_delete_lab" ON public.experiments FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- ROOMS ----------------------------------------------------------------------
DROP POLICY IF EXISTS "rooms_select_lab" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_lab" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_lab" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_lab" ON public.rooms;
CREATE POLICY "rooms_select_lab" ON public.rooms FOR SELECT TO authenticated
  USING (public.can_read_lab(lab_id));
CREATE POLICY "rooms_insert_lab" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "rooms_update_lab" ON public.rooms FOR UPDATE TO authenticated
  USING (public.can_write_lab(lab_id)) WITH CHECK (public.can_write_lab(lab_id));
CREATE POLICY "rooms_delete_lab" ON public.rooms FOR DELETE TO authenticated
  USING (public.can_delete_lab(lab_id));

-- EXPERIMENT_ANIMALS (junction — scopes via parent experiment's lab) --------
DROP POLICY IF EXISTS "experiment_animals_select_lab" ON public.experiment_animals;
DROP POLICY IF EXISTS "experiment_animals_insert_lab" ON public.experiment_animals;
DROP POLICY IF EXISTS "experiment_animals_update_lab" ON public.experiment_animals;
DROP POLICY IF EXISTS "experiment_animals_delete_lab" ON public.experiment_animals;
CREATE POLICY "experiment_animals_select_lab" ON public.experiment_animals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.experiments e
    WHERE e.id = experiment_animals.experiment_id
      AND public.can_read_lab(e.lab_id)
  ));
CREATE POLICY "experiment_animals_insert_lab" ON public.experiment_animals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.experiments e
    WHERE e.id = experiment_animals.experiment_id
      AND public.can_write_lab(e.lab_id)
  ));
CREATE POLICY "experiment_animals_update_lab" ON public.experiment_animals
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.experiments e
    WHERE e.id = experiment_animals.experiment_id
      AND public.can_write_lab(e.lab_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.experiments e
    WHERE e.id = experiment_animals.experiment_id
      AND public.can_write_lab(e.lab_id)
  ));
CREATE POLICY "experiment_animals_delete_lab" ON public.experiment_animals
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.experiments e
    WHERE e.id = experiment_animals.experiment_id
      AND public.can_delete_lab(e.lab_id)
  ));

-- ============================================================================
-- PROFILES — see anyone you share a lab with; self-update only
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_self_or_lab"   ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_by_pi_or_manager" ON public.profiles;
-- profiles_update_self stays unchanged.

CREATE POLICY "profiles_select_self_or_lab" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      -- Share at least one lab with the target profile
      SELECT 1 FROM public.lab_memberships m1
      JOIN public.lab_memberships m2 ON m1.lab_id = m2.lab_id
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = profiles.id
    )
    OR EXISTS (
      -- Or you're a facility overseer of any lab they belong to
      SELECT 1 FROM public.lab_memberships m
      WHERE m.user_id = profiles.id
        AND public.is_facility_overseer_of_lab(m.lab_id)
    )
  );

-- Note: there is no longer a "PI updates other profiles" policy. Role
-- changes happen on lab_memberships, not on profiles. PIs/lab_managers
-- update memberships instead.

-- ============================================================================
-- LABS — read if member OR facility overseer; PI of the lab can update
-- ============================================================================
DROP POLICY IF EXISTS "labs_select_member"        ON public.labs;
DROP POLICY IF EXISTS "labs_update_pi"            ON public.labs;
-- labs_insert_authenticated stays unchanged (bootstrap).

CREATE POLICY "labs_select_member" ON public.labs
  FOR SELECT TO authenticated
  USING (public.is_lab_member(id) OR public.is_facility_overseer_of_lab(id));

CREATE POLICY "labs_update_pi" ON public.labs
  FOR UPDATE TO authenticated
  USING      (public.role_in_lab(id) = 'pi'::public.user_role)
  WITH CHECK (public.role_in_lab(id) = 'pi'::public.user_role);

-- ============================================================================
-- LAB_INVITES — PI/lab_manager of the inviting lab manages
-- ============================================================================
DROP POLICY IF EXISTS "lab_invites_select_pi" ON public.lab_invites;
DROP POLICY IF EXISTS "lab_invites_write_pi"  ON public.lab_invites;

CREATE POLICY "lab_invites_select_pi" ON public.lab_invites
  FOR SELECT TO authenticated
  USING (public.role_in_lab(lab_id) IN (
    'pi'::public.user_role, 'lab_manager'::public.user_role
  ));

CREATE POLICY "lab_invites_write_pi" ON public.lab_invites
  FOR ALL TO authenticated
  USING (public.role_in_lab(lab_id) IN (
    'pi'::public.user_role, 'lab_manager'::public.user_role
  ))
  WITH CHECK (public.role_in_lab(lab_id) IN (
    'pi'::public.user_role, 'lab_manager'::public.user_role
  ));
-- get_pending_invite(token) function still allows token-bearing accept flow.

-- ============================================================================
-- LAB_MEMBERSHIPS — see your own + same-lab; PI/lab_manager manages;
-- self can leave
-- ============================================================================

CREATE POLICY "lab_memberships_select" ON public.lab_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_lab_member(lab_id)
    OR public.is_facility_overseer_of_lab(lab_id)
  );

-- INSERT: PI/lab_manager adding others, OR a user adding themselves as PI
-- of a lab that doesn't have one yet (bootstrap path for new-lab onboarding).
CREATE POLICY "lab_memberships_insert" ON public.lab_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    public.role_in_lab(lab_id) IN (
      'pi'::public.user_role, 'lab_manager'::public.user_role
    )
    OR (
      user_id = auth.uid()
      AND role = 'pi'::public.user_role
      AND NOT EXISTS (
        SELECT 1 FROM public.lab_memberships m
        WHERE m.lab_id = lab_memberships.lab_id
          AND m.role  = 'pi'::public.user_role
      )
    )
  );

CREATE POLICY "lab_memberships_update_pi" ON public.lab_memberships
  FOR UPDATE TO authenticated
  USING      (public.role_in_lab(lab_id) IN (
    'pi'::public.user_role, 'lab_manager'::public.user_role
  ))
  WITH CHECK (public.role_in_lab(lab_id) IN (
    'pi'::public.user_role, 'lab_manager'::public.user_role
  ));

CREATE POLICY "lab_memberships_delete_pi_or_self" ON public.lab_memberships
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()                     -- you can always leave a lab
    OR public.role_in_lab(lab_id) IN (
      'pi'::public.user_role, 'lab_manager'::public.user_role
    )
  );

-- ============================================================================
-- FACILITY_MEMBERSHIPS — facility_manager manages; visible to facility peers
-- ============================================================================

CREATE POLICY "facility_memberships_select" ON public.facility_memberships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.facility_memberships fm
      WHERE fm.user_id     = auth.uid()
        AND fm.facility_id = facility_memberships.facility_id
    )
  );

CREATE POLICY "facility_memberships_write_manager" ON public.facility_memberships
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_memberships fm
      WHERE fm.user_id     = auth.uid()
        AND fm.facility_id = facility_memberships.facility_id
        AND fm.role        = 'facility_manager'::public.user_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.facility_memberships fm
      WHERE fm.user_id     = auth.uid()
        AND fm.facility_id = facility_memberships.facility_id
        AND fm.role        = 'facility_manager'::public.user_role
    )
  );

-- ============================================================================
-- FACILITIES — visible to anyone with a membership in the facility OR in any
-- lab under it; facility_manager updates; any authenticated can create
-- (bootstrap, mirrors labs_insert_authenticated)
-- ============================================================================

CREATE POLICY "facilities_select" ON public.facilities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_memberships fm
      WHERE fm.user_id = auth.uid() AND fm.facility_id = facilities.id
    )
    OR EXISTS (
      SELECT 1 FROM public.labs l
      JOIN public.lab_memberships lm ON lm.lab_id = l.id
      WHERE l.facility_id = facilities.id
        AND lm.user_id    = auth.uid()
    )
  );

CREATE POLICY "facilities_insert_authenticated" ON public.facilities
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "facilities_update_manager" ON public.facilities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_memberships fm
      WHERE fm.user_id     = auth.uid()
        AND fm.facility_id = facilities.id
        AND fm.role        = 'facility_manager'::public.user_role
    )
  );
