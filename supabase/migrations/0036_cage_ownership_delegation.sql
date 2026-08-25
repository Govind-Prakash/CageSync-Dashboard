-- 0036_cage_ownership_delegation.sql
-- Workstream IX-2: attribute cages to a researcher + delegation flags.
--
-- What this adds:
--   1. cages.owner_user_id  — nullable FK to profiles(id). Billing
--      attributes each cage to this user. NULL = "unassigned" and
--      IX-4's RPCs will bill unassigned cages to the lab's PI as a
--      default fallback.
--   2. cages.vet_delegation_override boolean — nullable. NULL = "use
--      lab default". TRUE = force-delegate. FALSE = force-not-delegated
--      even if lab default is on. Effective flag =
--      COALESCE(override, lab_default).
--   3. Lab-level default stored in existing labs.settings jsonb under
--      key 'vet_delegation_default' (default false when absent). No
--      new column on labs — keeps update_lab_settings() as the single
--      write path we already ship.
--   4. Backfill: every existing cage gets owner_user_id set to the
--      earliest-joined PI of its lab (deterministic tie-break). Cages
--      in labs with zero PIs stay NULL and bill nowhere until fixed.
--   5. set_cage_owner(cage_id, owner_user_id) RPC — gated to PI /
--      lab_manager so a technician cannot silently reassign someone
--      else's cage. Anyone in the lab can still set owner at INSERT
--      time (via existing cages INSERT policy).
--   6. set_cage_delegation(cage_id, override) RPC — same gating.
--
-- Idempotent. Purely additive.

-- ============================================================
-- 1. Columns on cages
-- ============================================================

ALTER TABLE public.cages
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.cages
  ADD COLUMN IF NOT EXISTS vet_delegation_override boolean;

CREATE INDEX IF NOT EXISTS idx_cages_owner_user_id
  ON public.cages(owner_user_id);

-- ============================================================
-- 2. Backfill owner_user_id → earliest-joined PI of each cage's lab
-- ============================================================
-- Only touch cages that don't already have an owner (idempotent
-- when re-run: it won't stomp values set later by the dashboard).

UPDATE public.cages c
   SET owner_user_id = (
     SELECT lm.user_id
       FROM public.lab_memberships lm
      WHERE lm.lab_id = c.lab_id
        AND lm.role   = 'pi'::public.user_role
      ORDER BY lm.joined_at NULLS LAST, lm.user_id
      LIMIT 1
   )
 WHERE c.owner_user_id IS NULL
   AND c.lab_id IS NOT NULL;

-- ============================================================
-- 3. RPC: reassign cage owner (PI / lab_manager only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_cage_owner(
  p_cage_id       uuid,
  p_owner_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab_id uuid;
  v_role   public.user_role;
BEGIN
  SELECT lab_id INTO v_lab_id
    FROM public.cages
   WHERE id = p_cage_id;

  IF v_lab_id IS NULL THEN
    RAISE EXCEPTION 'cage_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  v_role := public.role_in_lab(v_lab_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'pi'::public.user_role,
       'lab_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_to_reassign_cage'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate the new owner is actually a member of the same lab.
  IF p_owner_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lab_memberships
     WHERE user_id = p_owner_user_id AND lab_id = v_lab_id
  ) THEN
    RAISE EXCEPTION 'owner_not_in_lab' USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE public.cages
     SET owner_user_id = p_owner_user_id,
         updated_at    = now()
   WHERE id = p_cage_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_cage_owner(uuid, uuid)
  TO authenticated;

-- ============================================================
-- 4. RPC: set per-cage delegation override (PI / lab_manager only)
-- ============================================================
-- Pass NULL to clear override (back to lab default), TRUE to
-- force-delegate this specific cage, FALSE to force-not-delegated.

CREATE OR REPLACE FUNCTION public.set_cage_delegation(
  p_cage_id  uuid,
  p_override boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab_id uuid;
  v_role   public.user_role;
BEGIN
  SELECT lab_id INTO v_lab_id
    FROM public.cages
   WHERE id = p_cage_id;

  IF v_lab_id IS NULL THEN
    RAISE EXCEPTION 'cage_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  v_role := public.role_in_lab(v_lab_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'pi'::public.user_role,
       'lab_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_to_set_delegation'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.cages
     SET vet_delegation_override = p_override,
         updated_at              = now()
   WHERE id = p_cage_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_cage_delegation(uuid, boolean)
  TO authenticated;

-- ============================================================
-- 5. Helper: effective delegation for a cage (used by IX-4 RPCs)
-- ============================================================
-- Returns TRUE if the cage is currently billed at the delegation
-- rate. cage-level override wins; else falls back to
-- labs.settings->>'vet_delegation_default' as boolean.

CREATE OR REPLACE FUNCTION public.cage_is_delegated(p_cage_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    c.vet_delegation_override,
    COALESCE((l.settings->>'vet_delegation_default')::boolean, false)
  )
  FROM public.cages c
  LEFT JOIN public.labs l ON l.id = c.lab_id
  WHERE c.id = p_cage_id;
$$;

GRANT EXECUTE ON FUNCTION public.cage_is_delegated(uuid)
  TO authenticated;

-- ============================================================
-- Verify (paste-runner sanity checks)
-- ============================================================
SELECT COUNT(*) AS owner_column_exists
  FROM information_schema.columns
 WHERE table_name = 'cages' AND column_name = 'owner_user_id';

SELECT COUNT(*) AS override_column_exists
  FROM information_schema.columns
 WHERE table_name = 'cages' AND column_name = 'vet_delegation_override';

SELECT COUNT(*) AS rpcs_registered
  FROM pg_proc
 WHERE proname IN ('set_cage_owner', 'set_cage_delegation', 'cage_is_delegated');

-- Should return > 0 if you have existing cages with a PI in their lab.
SELECT COUNT(*) AS cages_now_owned
  FROM public.cages
 WHERE owner_user_id IS NOT NULL;
