-- 0006_tighten_invite_token_access.sql
-- Closes a leak in the lab_invites RLS: the existing policy
-- `lab_invites_select_by_token` used `USING (token IS NOT NULL)`, which
-- allowed any signed-in (or anon) user to enumerate every pending invite
-- in the system (email, role, lab_id). Tokens were intended to act as
-- bearer secrets but the policy never actually compared them.
--
-- Replacement:
--   * Drop the broad SELECT policy.
--   * Expose a SECURITY DEFINER function `get_pending_invite(p_token)`
--     that returns the invite row only when (token matches) AND (not
--     accepted) AND (not expired). Without the token, callers can read
--     nothing.
--
-- After this migration, the only ways to read lab_invites rows are:
--   1. Via `lab_invites_select_pi` (PI / lab_manager of the same lab —
--      to see pending invites on the Team page; unchanged).
--   2. Via `get_pending_invite('<token>')` — used by the accept-invite
--      flow we'll wire next.

-- 1. Drop the leaky policy.
DROP POLICY IF EXISTS "lab_invites_select_by_token" ON public.lab_invites;

-- 2. Token-required accessor.
CREATE OR REPLACE FUNCTION public.get_pending_invite(p_token text)
RETURNS public.lab_invites
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.lab_invites
  WHERE token = p_token
    AND COALESCE(accepted, false) = false
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_invite(text) TO anon, authenticated;
