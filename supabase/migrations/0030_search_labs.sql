-- 0030_search_labs.sql
-- Workstream II-5: institution-scoped lab discovery for facility
-- staff. A facility manager verified for HUJI can search HUJI labs
-- to request oversight of, without ever seeing labs at another
-- institution. Feeds the /dashboard/facility "Request lab
-- affiliation" flow.
--
-- Two pieces:
--   * can_access_institution(institution_id) — verified-user gate.
--   * search_labs(institution_id, campus?, query?) — SECURITY
--     DEFINER RPC that returns rows for that institution only,
--     joined with the PI's display name for the "who runs this
--     lab" column.
--
-- Idempotent.

-- ============================================================
-- 1. can_access_institution
-- ============================================================
-- The caller has "access" to an institution if they have any
-- user_institution_verifications row for it — via email_domain
-- auto-verify at signup (0018), or via email_code fallback (0029).
-- This is what prevents cross-institution phishing: a random user
-- can't discover HUJI labs unless they've verified.

CREATE OR REPLACE FUNCTION public.can_access_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_institution_verifications
     WHERE user_id = auth.uid()
       AND institution_id = p_institution_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_institution(uuid) TO authenticated;

-- ============================================================
-- 2. search_labs
-- ============================================================
-- Returns labs at the requested institution, optionally filtered by
-- campus and/or a partial name match. Includes the PI's name +
-- email so the requesting facility manager can see who they're
-- reaching out to. `discoverable = false` labs are hidden — a
-- future opt-out for labs that want to stay off cross-lab search.

CREATE OR REPLACE FUNCTION public.search_labs(
  p_institution_id uuid,
  p_campus         text DEFAULT NULL,
  p_query          text DEFAULT NULL
)
RETURNS TABLE (
  id             uuid,
  name           text,
  campus         text,
  institution_id uuid,
  pi_name        text,
  pi_email       text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_institution(p_institution_id) THEN
    RAISE EXCEPTION 'not_authorized_for_institution'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.campus,
      l.institution_id,
      p.full_name AS pi_name,
      p.email     AS pi_email
    FROM public.labs l
    LEFT JOIN public.lab_memberships lm
      ON lm.lab_id = l.id
     AND lm.role   = 'pi'::public.user_role
    LEFT JOIN public.profiles p ON p.id = lm.user_id
    WHERE l.institution_id = p_institution_id
      AND (p_campus IS NULL OR l.campus IS NOT DISTINCT FROM p_campus)
      AND (p_query  IS NULL OR l.name ILIKE '%' || p_query || '%')
      AND COALESCE(l.discoverable, true) = true
    ORDER BY l.name
    LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_labs(uuid, text, text)
  TO authenticated;
