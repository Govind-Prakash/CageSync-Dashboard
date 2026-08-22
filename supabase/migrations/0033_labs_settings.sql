-- 0033_labs_settings.sql
-- Workstream VII-2 groundwork: proper home for lab-wide config.
--
-- Historically the dashboard wrote lab-scoped preferences (default
-- strain, lab address, google sheets URL, etc.) into
-- `profiles.lab_settings` — a per-user JSONB. That's structurally
-- wrong: two PIs of the same lab would each have their own copy
-- and they'd silently drift. This migration moves the true home
-- to `labs.settings` and provides a gated RPC to write it.
--
-- Old `profiles.lab_settings` stays for one release cycle as a
-- rollback safety valve. When the dashboard + Flutter both read
-- from labs.settings for at least one release, ship a follow-up
-- migration to drop it.
--
-- Idempotent.

-- ============================================================
-- 1. Column
-- ============================================================

ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 2. Backfill
-- ============================================================
-- For every lab, copy the newest PI's profiles.lab_settings blob
-- into labs.settings — but only for labs that still have the empty
-- default. Idempotent: rerunning after the client has written
-- real data won't stomp it.
--
-- Lab-name / institution keys are NOT stripped here because the
-- dashboard's Lab Profile form still writes them into the blob
-- pending the client rewrite (VII-2b). Once that ships, add a
-- follow-up UPDATE that removes those specific keys.

UPDATE public.labs l
   SET settings = COALESCE(
     (SELECT p.lab_settings
        FROM public.profiles p
        JOIN public.lab_memberships lm ON lm.user_id = p.id
       WHERE lm.lab_id = l.id
         AND lm.role   = 'pi'::public.user_role
         AND p.lab_settings IS NOT NULL
         AND p.lab_settings <> '{}'::jsonb
       ORDER BY p.updated_at DESC NULLS LAST
       LIMIT 1),
     '{}'::jsonb
   )
 WHERE l.settings = '{}'::jsonb;

-- ============================================================
-- 3. Write RPC
-- ============================================================
-- Full replace: caller passes the entire settings jsonb.
-- Simpler than a patch/merge RPC for MVP; if we need partial
-- updates later, add update_lab_settings_patch(lab_id, patch)
-- that does `SET settings = settings || patch`.
--
-- Gated to PI + lab_manager per role_in_lab. Same authority tier
-- that manages the lab identity (labs.institution_id from II-3).

CREATE OR REPLACE FUNCTION public.update_lab_settings(
  p_lab_id   uuid,
  p_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.role_in_lab(p_lab_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'pi'::public.user_role,
       'lab_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_for_lab_settings'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.labs
     SET settings   = COALESCE(p_settings, '{}'::jsonb),
         updated_at = now()
   WHERE id = p_lab_id;

  RETURN p_settings;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lab_settings(uuid, jsonb)
  TO authenticated;
