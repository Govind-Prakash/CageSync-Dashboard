-- 0013_set_active_lab_function.sql
-- SECURITY DEFINER RPC used by the dashboard lab switcher to change the
-- caller's active lab. Wraps the update to profiles.lab_id so that:
--   1. We verify the caller actually has a membership in the target lab.
--      Without this, someone could set their profile.lab_id to any uuid
--      and gain RLS read/write scope for that lab (the SELECT/INSERT
--      policies use my_lab_id() as one of their gates).
--   2. The change is one atomic call from the client — no round-trip to
--      fetch memberships first.
--
-- Returns jsonb: { success: bool, error?: text, lab_id?: uuid }

CREATE OR REPLACE FUNCTION public.set_active_lab(p_lab_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  -- Caller must be a member of the target lab. Prevents privilege
  -- escalation via profile mutation.
  IF NOT EXISTS (
    SELECT 1 FROM public.lab_memberships
    WHERE user_id = v_user_id AND lab_id = p_lab_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_member');
  END IF;

  UPDATE public.profiles
  SET lab_id = p_lab_id
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'lab_id', p_lab_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_active_lab(uuid) TO authenticated;
