-- 0029_institution_email_verification.sql
-- Workstream II-4: email-code fallback for institution verification.
--
-- Path B for users whose signup email domain doesn't match their
-- institution's email_domains (e.g. a HUJI researcher who signed up
-- with a personal gmail). They enter their institutional email,
-- receive a 6-digit code, type it back — and we record a
-- user_institution_verifications row with verified_via='email_code'.
--
-- Two pieces live here:
--   * public.hash_verification_code(text) — sha256 helper so the API
--     route and this RPC agree on the wire format.
--   * public.verify_institution_code(institution_id, code) RPC —
--     validates + marks used + writes the verification.
--
-- The SEND side lives entirely in the /api/institutions/send-
-- verification API route (uses service role to bypass RLS, hashes
-- the code in node, inserts into email_verification_codes, sends
-- via Resend). Keeping the send logic out of Postgres avoids
-- needing pg_net or an extension for outbound HTTP.

CREATE OR REPLACE FUNCTION public.hash_verification_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = extensions, public
AS $$
  -- pgcrypto's digest lives in the `extensions` schema on Supabase
  -- projects; the SET search_path above resolves it there.
  SELECT encode(digest(p_code::bytea, 'sha256'), 'hex');
$$;

GRANT EXECUTE ON FUNCTION public.hash_verification_code(text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.verify_institution_code(
  p_institution_id uuid,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row     public.email_verification_codes;
  v_hash    text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_signed_in');
  END IF;

  -- Newest unused unexpired code for this (user, institution) pair.
  SELECT * INTO v_row
    FROM public.email_verification_codes
   WHERE user_id = v_user_id
     AND institution_id = p_institution_id
     AND NOT used
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_row IS NULL OR v_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_code');
  END IF;

  IF v_row.attempts >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_attempts');
  END IF;

  -- Increment attempts up front — a bad guess still consumes an
  -- attempt, so brute force is bounded.
  UPDATE public.email_verification_codes
     SET attempts = attempts + 1
   WHERE id = v_row.id;

  v_hash := public.hash_verification_code(p_code);
  IF v_row.code_hash <> v_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_mismatch');
  END IF;

  -- Right code. Consume it and record the verification.
  UPDATE public.email_verification_codes
     SET used = true
   WHERE id = v_row.id;

  INSERT INTO public.user_institution_verifications (
    user_id, institution_id, verified_via
  )
  VALUES (v_user_id, p_institution_id, 'email_code')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_institution_code(uuid, text)
  TO authenticated;
