-- 0011_accept_invite_function.sql
-- Trusted server-side accept-invite flow. Called by the dashboard's
-- /invite/accept page (and later by Flutter) when a user clicks an
-- invite link.
--
-- Why SECURITY DEFINER: lab_memberships_insert RLS does not allow a
-- non-member to add themselves to a lab. We don't want to relax that
-- policy — instead this function bypasses RLS as the single trusted
-- accept path, and validates the invite + email match in its body so
-- only the legitimate invitee can use it.
--
-- Returns JSON: { success: bool, error?: text, lab_id?: uuid, role?: text }
-- so callers can branch on the result without needing exceptions.

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_user_email text;
  v_invite    public.lab_invites;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  -- Token must point to a still-valid invite (not accepted, not expired).
  SELECT * INTO v_invite FROM public.get_pending_invite(p_token);
  IF v_invite IS NULL OR v_invite.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired');
  END IF;

  -- The invite was addressed to a specific email; the caller must be
  -- signed in as that user. Compared case-insensitively.
  SELECT email INTO v_user_email
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_email IS NULL OR LOWER(v_user_email) <> LOWER(v_invite.email) THEN
    RETURN jsonb_build_object(
      'success',      false,
      'error',        'email_mismatch',
      'invite_email', v_invite.email
    );
  END IF;

  -- Add the membership. ON CONFLICT covers the edge case of a user who
  -- was already in this lab (e.g. via bootstrap backfill) being
  -- re-invited — the role from the new invite takes precedence.
  INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
  VALUES (v_user_id, v_invite.lab_id, v_invite.role, 'invite')
  ON CONFLICT (user_id, lab_id) DO UPDATE
    SET role       = EXCLUDED.role,
        joined_via = EXCLUDED.joined_via;

  -- Switch the active lab to the one they just joined so the dashboard
  -- shows it immediately. The legacy profiles.role column is kept in
  -- sync to avoid breaking any code that still reads it.
  UPDATE public.profiles
  SET lab_id = v_invite.lab_id,
      role   = v_invite.role
  WHERE id = v_user_id;

  -- Consume the invite last, so partial failures above don't waste it.
  UPDATE public.lab_invites
  SET accepted = true
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'lab_id',  v_invite.lab_id,
    'role',    v_invite.role::text
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
