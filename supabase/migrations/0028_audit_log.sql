-- 0028_audit_log.sql
-- Workstream VII-1: destructive-operation audit trail.
-- Required for IACUC compliance ("who deleted / modified what and
-- when") at any institutional customer.
--
-- Ships:
--   * audit_logs table + RLS (PI + lab_manager read for their labs)
--   * public.audit_row_change() trigger function
--   * DELETE + UPDATE triggers on the 7 tables the roadmap
--     identifies as compliance-sensitive
--
-- Notes:
--   * IP address / user_agent are NOT captured here — Supabase
--     triggers don't have first-class access to request headers.
--     If we ever need that dimension, wrap the mutation in a
--     SECURITY DEFINER RPC and stash the headers explicitly.
--   * target_id is TEXT to accommodate both uuid-PK tables and
--     composite-PK tables (lab_memberships, lab_facility_affiliations)
--     which are recorded as a JSON key alongside.
--
-- Idempotent.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lab_id         uuid REFERENCES public.labs(id) ON DELETE SET NULL,
  action         text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  target_table   text NOT NULL,
  target_id      text,                  -- id for simple PK; composite JSON key for others
  before_data    jsonb,
  after_data     jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_lab_created_idx
  ON public.audit_logs (lab_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON public.audit_logs (target_table, target_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Read: only PI + lab_manager of the lab (welfare compliance is
-- their responsibility). Members with other roles can't inspect
-- the history — they can still read the current state of any row.
DROP POLICY IF EXISTS "audit_logs_read_pi_manager" ON public.audit_logs;
CREATE POLICY "audit_logs_read_pi_manager" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    lab_id IS NOT NULL
    AND public.is_lab_approver(lab_id)
  );

-- No API writes — the audit rows are written by triggers only,
-- SECURITY DEFINER'd through the trigger function.
GRANT SELECT ON public.audit_logs TO authenticated;

-- ============================================================
-- 2. Trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row_json    jsonb;
  v_before_json jsonb;
  v_after_json  jsonb;
  v_lab_id      uuid;
  v_target_id   text;
BEGIN
  -- Serialize the row(s) once; used to pull out lab_id + the
  -- primary key(s) generically without a per-table branch.
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_before_json := to_jsonb(OLD);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_after_json := to_jsonb(NEW);
  END IF;
  v_row_json := COALESCE(v_after_json, v_before_json);

  -- lab_id: every audited table has one (denormalized where needed
  -- like cage_flags, natural on cages/animals/litters/treatments/
  -- lab_memberships/lab_facility_affiliations).
  IF v_row_json ? 'lab_id' THEN
    v_lab_id := (v_row_json->>'lab_id')::uuid;
  END IF;

  -- target_id: prefer 'id' when the table has it; fall back to the
  -- composite key encoded as a small JSON object.
  IF v_row_json ? 'id' THEN
    v_target_id := v_row_json->>'id';
  ELSIF TG_TABLE_NAME = 'lab_memberships' THEN
    v_target_id := jsonb_build_object(
      'user_id', v_row_json->>'user_id',
      'lab_id',  v_row_json->>'lab_id'
    )::text;
  ELSIF TG_TABLE_NAME = 'lab_facility_affiliations' THEN
    v_target_id := jsonb_build_object(
      'lab_id',      v_row_json->>'lab_id',
      'facility_id', v_row_json->>'facility_id'
    )::text;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, lab_id, action, target_table, target_id,
    before_data, after_data
  )
  VALUES (
    auth.uid(), v_lab_id, lower(TG_OP), TG_TABLE_NAME, v_target_id,
    v_before_json, v_after_json
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Triggers
-- ============================================================

-- Wrap each in DROP + CREATE for idempotency.
-- DELETE audit — cages, animals, litters, treatments.

DROP TRIGGER IF EXISTS audit_delete_cages       ON public.cages;
DROP TRIGGER IF EXISTS audit_delete_animals     ON public.animals;
DROP TRIGGER IF EXISTS audit_delete_litters     ON public.litters;
DROP TRIGGER IF EXISTS audit_delete_treatments  ON public.treatments;

CREATE TRIGGER audit_delete_cages
  AFTER DELETE ON public.cages
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_delete_animals
  AFTER DELETE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_delete_litters
  AFTER DELETE ON public.litters
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_delete_treatments
  AFTER DELETE ON public.treatments
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- UPDATE audit — cage_flags.resolved flip, lab_memberships.role
-- change, lab_facility_affiliations.status change. Filtered with
-- WHEN clauses so noisy neutral updates (e.g. touching updated_at)
-- don't spam the log.

DROP TRIGGER IF EXISTS audit_update_cage_flags_resolved       ON public.cage_flags;
DROP TRIGGER IF EXISTS audit_update_lab_memberships_role      ON public.lab_memberships;
DROP TRIGGER IF EXISTS audit_update_affiliation_status        ON public.lab_facility_affiliations;

CREATE TRIGGER audit_update_cage_flags_resolved
  AFTER UPDATE OF resolved ON public.cage_flags
  FOR EACH ROW
  WHEN (OLD.resolved IS DISTINCT FROM NEW.resolved)
  EXECUTE FUNCTION public.audit_row_change();

CREATE TRIGGER audit_update_lab_memberships_role
  AFTER UPDATE OF role ON public.lab_memberships
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.audit_row_change();

CREATE TRIGGER audit_update_affiliation_status
  AFTER UPDATE OF status ON public.lab_facility_affiliations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.audit_row_change();
