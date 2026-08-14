-- 0018_extend_handle_new_user_institution_match.sql
-- Workstream II-2: On new signup, if the user's email domain matches
-- an institution in the registry, auto-record a verification row so
-- they can create facilities / search labs at that institution
-- without going through the email-code fallback (II-4).
--
-- Extends 0014's handle_new_user. Preserves sections (1)–(3)
-- verbatim; appends:
--
--   (4) Institution auto-verify — always runs. Records into
--       user_institution_verifications with verified_via='email_domain'
--       for every active institution whose email_domains contains the
--       user's email domain. ON CONFLICT DO NOTHING so re-runs are
--       idempotent.
--
--   (5) Personal lab institution backfill — only runs if section (3)
--       created a personal lab AND (4) matched exactly one institution.
--       Sets labs.institution_id on that fresh lab so it isn't orphaned
--       from the registry. Skipped if the user was signed up via an
--       invite (that lab's institution is the PI's call, not ours) or
--       if the domain matched multiple institutions (unusual — user
--       should pick manually).
--
-- Rollback: restore the 0014 body verbatim.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite            public.lab_invites;
  v_full_name         text;
  v_lab_name          text;
  v_new_lab_id        uuid;
  v_email_domain      text;
  v_matched_inst_id   uuid;
  v_matched_inst_cnt  int;
BEGIN
  -- (1) Create profile.
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- (2) Try to attach a pending invite matching this email.
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
      INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
      VALUES (NEW.id, v_invite.lab_id, v_invite.role, 'invite_signup')
      ON CONFLICT (user_id, lab_id) DO UPDATE
        SET role       = EXCLUDED.role,
            joined_via = EXCLUDED.joined_via;

      UPDATE public.profiles
         SET lab_id = v_invite.lab_id,
             role   = v_invite.role
       WHERE id = NEW.id;

      UPDATE public.lab_invites
         SET accepted = true
       WHERE id = v_invite.id;
    END IF;
  END IF;

  -- (3) Fallback: no invite matched, so give this user a personal lab
  --     so the dashboard is usable immediately. Only runs if step (2)
  --     didn't create a membership.
  IF NOT EXISTS (
    SELECT 1 FROM public.lab_memberships WHERE user_id = NEW.id
  ) THEN
    v_full_name := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'New user'
    );

    v_lab_name := v_full_name || '''s Colony';

    INSERT INTO public.labs (name)
    VALUES (v_lab_name)
    RETURNING id INTO v_new_lab_id;

    INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
    VALUES (NEW.id, v_new_lab_id, 'pi'::public.user_role, 'auto_created_personal');

    UPDATE public.profiles
       SET lab_id = v_new_lab_id,
           role   = 'pi'::public.user_role
     WHERE id = NEW.id;
  END IF;

  -- (4) Institution auto-verify by email domain.
  --     Always runs (even for invite-signup path — an invitee still
  --     benefits from having their institution affiliation recorded).
  IF NEW.email IS NOT NULL THEN
    v_email_domain := split_part(NEW.email, '@', 2);

    IF v_email_domain <> '' THEN
      INSERT INTO public.user_institution_verifications (user_id, institution_id, verified_via)
      SELECT NEW.id, i.id, 'email_domain'
        FROM public.institutions i
       WHERE v_email_domain = ANY (i.email_domains)
         AND i.status = 'active'
      ON CONFLICT DO NOTHING;

      -- (5) If (a) we auto-created a personal lab in step (3), AND
      --     (b) the email domain uniquely identifies one institution,
      --     backfill labs.institution_id on that lab. Multi-match is
      --     rare but real (shared domains) — skip in that case so the
      --     user picks manually.
      IF v_new_lab_id IS NOT NULL THEN
        SELECT count(*), max(i.id)
          INTO v_matched_inst_cnt, v_matched_inst_id
          FROM public.institutions i
         WHERE v_email_domain = ANY (i.email_domains)
           AND i.status = 'active';

        IF v_matched_inst_cnt = 1 THEN
          UPDATE public.labs
             SET institution_id = v_matched_inst_id
           WHERE id = v_new_lab_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
