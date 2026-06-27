-- 0012_auto_match_invites_on_signup.sql
-- Extends the existing handle_new_user trigger so that a brand-new signup
-- whose email matches a pending lab_invite is auto-added to the inviting
-- lab. Eliminates the manual "click the accept link" step for the common
-- case where the invitee creates their account in response to the invite.
--
-- The trigger replaces the previous function body atomically — the
-- existing on_auth_user_created trigger on auth.users keeps firing it.
-- Profile-creation behavior (rows 7–13 of the original function) is
-- preserved; the invite-matching block is appended.
--
-- Edge cases handled:
--   * No pending invite for the email          → noop, normal signup
--   * Multiple pending invites for same email  → most recent wins; others
--                                                stay pending (can be
--                                                accepted later via the
--                                                /invite/accept page)
--   * Case-insensitive email match             → LOWER()
--   * Already a member of the invited lab     → role refreshed via ON CONFLICT
--   * Expired invite                           → ignored
--
-- The function runs as SECURITY DEFINER (postgres), so it bypasses RLS on
-- profiles / lab_memberships / lab_invites — which is required because
-- the new user has no lab membership yet and wouldn't satisfy the
-- lab_memberships_insert WITH CHECK predicate.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.lab_invites;
BEGIN
  -- (1) Original behavior: create the profile.
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- (2) Auto-match: most recent pending non-expired invite for this email.
  IF NEW.email IS NOT NULL THEN
    SELECT *
      INTO v_invite
      FROM public.lab_invites
     WHERE LOWER(email) = LOWER(NEW.email)
       AND COALESCE(accepted, false) = false
       AND (expires_at IS NULL OR expires_at > now())
     ORDER BY created_at DESC
     LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
      -- Insert membership. ON CONFLICT covers a rare race where another
      -- path already added the user (e.g. concurrent /invite/accept call).
      INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
      VALUES (NEW.id, v_invite.lab_id, v_invite.role, 'invite_signup')
      ON CONFLICT (user_id, lab_id) DO UPDATE
        SET role       = EXCLUDED.role,
            joined_via = EXCLUDED.joined_via;

      -- Set the joined lab as the user's active lab.
      UPDATE public.profiles
         SET lab_id = v_invite.lab_id,
             role   = v_invite.role
       WHERE id = NEW.id;

      -- Consume the invite.
      UPDATE public.lab_invites
         SET accepted = true
       WHERE id = v_invite.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
