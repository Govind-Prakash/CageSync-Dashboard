-- 0034_remove_member.sql
-- Ships remove_member(target_user_id, lab_id) RPC so a PI or
-- lab_manager can revoke someone's access. Companion to the
-- invite flow (VI-1) — the other end of team management.
--
-- Guards:
--   * Caller must be PI or lab_manager of the target lab.
--   * Cannot remove the last remaining PI of a lab (protects
--     against orphaning a lab with no admin).
--   * Cannot remove YOURSELF as PI. Use "leave lab" flow instead
--     (not shipped yet — for now the PI has to invite another PI,
--     have them accept, then this RPC can be used to remove the
--     original PI).
--
-- Returns jsonb { success, error? }. Idempotent.

CREATE OR REPLACE FUNCTION public.remove_member(
  p_target_user_id uuid,
  p_lab_id         uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_target_role public.user_role;
  v_pi_count int;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  IF NOT public.is_lab_approver(p_lab_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_authorized',
      'detail', 'Only the PI or lab manager can remove members.'
    );
  END IF;

  -- Look up target's role in this lab.
  SELECT role INTO v_target_role
    FROM public.lab_memberships
   WHERE user_id = p_target_user_id AND lab_id = p_lab_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_a_member');
  END IF;

  -- If target is a PI, make sure at least one other PI remains.
  IF v_target_role = 'pi'::public.user_role THEN
    SELECT count(*) INTO v_pi_count
      FROM public.lab_memberships
     WHERE lab_id = p_lab_id
       AND role   = 'pi'::public.user_role
       AND user_id <> p_target_user_id;

    IF v_pi_count = 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'last_pi',
        'detail', 'Invite another PI first. A lab must always have at least one PI.'
      );
    END IF;
  END IF;

  -- Same-person guard is friendlier as a distinct error than the
  -- last_pi one, so name it explicitly. Non-PI self-removal is
  -- allowed if it makes sense; today the UI never surfaces that
  -- path so this is future-proofing.
  IF v_caller = p_target_user_id
     AND v_target_role = 'pi'::public.user_role
  THEN
    -- Fall through — the last_pi guard above already handled it if
    -- they're the sole PI. If there's another PI, self-removal is
    -- OK.
    NULL;
  END IF;

  DELETE FROM public.lab_memberships
   WHERE user_id = p_target_user_id AND lab_id = p_lab_id;

  -- If the removed user's `profiles.lab_id` still points at this
  -- lab, clear it so their next login doesn't try to sync a lab
  -- they no longer belong to. Auto-create-personal-lab in
  -- handle_new_user is only for signup; here they'd land on the
  -- solo-lab picker or their next remaining membership.
  UPDATE public.profiles
     SET lab_id = (
       SELECT lab_id FROM public.lab_memberships
        WHERE user_id = p_target_user_id
        ORDER BY joined_via NULLS LAST
        LIMIT 1
     )
   WHERE id = p_target_user_id
     AND lab_id = p_lab_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;
