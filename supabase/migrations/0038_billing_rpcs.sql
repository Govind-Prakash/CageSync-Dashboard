-- 0038_billing_rpcs.sql
-- Workstream IX-4: the actual billing math.
--
-- Adds three SECURITY DEFINER RPCs that combine everything from
-- IX-1..IX-3 into computed totals:
--
--   * get_researcher_billing(period_start, period_end)
--       — for the calling user. Returns per-cage breakdown +
--         totals in the facility's currency.
--   * get_pi_billing(lab_id, period_start, period_end)
--       — for a PI / lab_manager. Returns per-researcher rollup
--         (plus an "Unassigned" bucket for cages with no owner).
--   * get_vet_facility_revenue(facility_id, period_start, period_end)
--       — for a facility_vet / manager. Returns per-lab rollup.
--
-- Formula (per cage):
--   days_active   = LEAST(period_end, today) - GREATEST(cage.created_at::date, period_start) + 1
--                   (clamped to >= 0 if cage did not exist in period)
--   weeks_active  = CEIL(days_active / 7.0)   -- partial week counts as full
--                                              (matches typical vivarium billing)
--   rate          = latest facility_billing_rates row with
--                   effective_from <= period_end for cage's facility
--   base_minor    = weeks_active × rate.weekly_maintenance_minor
--   delegation_minor = CASE WHEN cage_is_delegated(cage) THEN
--                        weeks_active × rate.vet_delegation_surcharge_minor
--                        ELSE 0
--                      END
--
-- Formula (per user):
--   extras_minor  = SUM(cage_services.amount_minor)
--                   WHERE billed_to = user AND performed_at in [start, end]
--   total_minor   = base + delegation + extras
--
-- Amounts are returned in minor units (cents/agorot/paise). Currency
-- code is included so the UI can format via Intl.NumberFormat.
--
-- Idempotent. Purely additive.

-- ============================================================
-- 1. Internal helper: per-cage cost for a period
-- ============================================================
-- Returns (weeks_active, base_minor, delegation_minor, rate_id).
-- Used by the three public RPCs below.

CREATE OR REPLACE FUNCTION public._billing_cage_cost(
  p_cage_id      uuid,
  p_period_start date,
  p_period_end   date
)
RETURNS TABLE (
  weeks_active       int,
  base_minor         bigint,
  delegation_minor   bigint,
  rate_id            uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at    date;
  v_facility_id   uuid;
  v_is_delegated  boolean;
  v_weekly_minor  int;
  v_surcharge     int;
  v_rate_id       uuid;
  v_days          int;
  v_weeks         int;
  v_effective_end date;
BEGIN
  SELECT c.created_at::date, l.facility_id
    INTO v_created_at, v_facility_id
    FROM public.cages c
    LEFT JOIN public.labs l ON l.id = c.lab_id
   WHERE c.id = p_cage_id;

  IF v_created_at IS NULL THEN
    RETURN QUERY SELECT 0, 0::bigint, 0::bigint, NULL::uuid;
    RETURN;
  END IF;

  v_effective_end := LEAST(p_period_end, CURRENT_DATE);

  IF v_created_at > v_effective_end THEN
    -- Cage didn't exist during the requested period.
    RETURN QUERY SELECT 0, 0::bigint, 0::bigint, NULL::uuid;
    RETURN;
  END IF;

  v_days := (v_effective_end - GREATEST(v_created_at, p_period_start)) + 1;
  IF v_days <= 0 THEN
    RETURN QUERY SELECT 0, 0::bigint, 0::bigint, NULL::uuid;
    RETURN;
  END IF;

  v_weeks := CEIL(v_days::numeric / 7.0)::int;

  -- Rate lookup: latest effective_from <= period_end for this facility.
  SELECT r.id, r.weekly_maintenance_minor, r.vet_delegation_surcharge_minor
    INTO v_rate_id, v_weekly_minor, v_surcharge
    FROM public.facility_billing_rates r
   WHERE r.facility_id     = v_facility_id
     AND r.effective_from <= p_period_end
   ORDER BY r.effective_from DESC
   LIMIT 1;

  IF v_rate_id IS NULL THEN
    -- No rate configured yet → cost is zero (still return weeks so
    -- UI can surface "rate not set").
    RETURN QUERY SELECT v_weeks, 0::bigint, 0::bigint, NULL::uuid;
    RETURN;
  END IF;

  v_is_delegated := public.cage_is_delegated(p_cage_id);

  RETURN QUERY SELECT
    v_weeks,
    (v_weeks::bigint * v_weekly_minor)::bigint AS base_minor,
    CASE WHEN v_is_delegated
         THEN (v_weeks::bigint * v_surcharge)::bigint
         ELSE 0::bigint
    END AS delegation_minor,
    v_rate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public._billing_cage_cost(uuid, date, date) TO authenticated;

-- ============================================================
-- 2. get_researcher_billing — the calling user's own bill
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_researcher_billing(
  p_period_start date,
  p_period_end   date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_currency     text;
  v_total_base   bigint := 0;
  v_total_deleg  bigint := 0;
  v_total_extras bigint := 0;
  v_breakdown    jsonb  := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Pick a currency from any facility this user's cages belong to.
  -- If the user's cages span multiple facilities, we return the
  -- first one and the UI can decide how to display (multi-currency
  -- deferred per plan).
  SELECT f.currency_code INTO v_currency
    FROM public.cages c
    LEFT JOIN public.labs       l ON l.id = c.lab_id
    LEFT JOIN public.facilities f ON f.id = l.facility_id
   WHERE c.owner_user_id = v_uid
     AND f.currency_code IS NOT NULL
   LIMIT 1;

  -- Per-cage breakdown.
  WITH per_cage AS (
    SELECT
      c.id            AS cage_id,
      c.name          AS cage_name,
      c.barcode       AS cage_barcode,
      cost.weeks_active,
      cost.base_minor,
      cost.delegation_minor
    FROM public.cages c
    CROSS JOIN LATERAL public._billing_cage_cost(c.id, p_period_start, p_period_end) cost
    WHERE c.owner_user_id = v_uid
  ),
  per_cage_extras AS (
    SELECT pc.*,
      COALESCE((
        SELECT SUM(cs.amount_minor)::bigint
          FROM public.cage_services cs
         WHERE cs.cage_id     = pc.cage_id
           AND cs.billed_to   = v_uid
           AND cs.performed_at::date BETWEEN p_period_start AND p_period_end
      ), 0::bigint) AS extras_minor
    FROM per_cage pc
  )
  SELECT
    COALESCE(SUM(base_minor), 0),
    COALESCE(SUM(delegation_minor), 0),
    COALESCE(SUM(extras_minor), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
      'cage_id',          cage_id,
      'cage_name',        cage_name,
      'cage_barcode',     cage_barcode,
      'weeks_active',     weeks_active,
      'base_minor',       base_minor,
      'delegation_minor', delegation_minor,
      'extras_minor',     extras_minor,
      'total_minor',      base_minor + delegation_minor + extras_minor
    ) ORDER BY (base_minor + delegation_minor + extras_minor) DESC), '[]'::jsonb)
  INTO v_total_base, v_total_deleg, v_total_extras, v_breakdown
  FROM per_cage_extras;

  RETURN jsonb_build_object(
    'period_start',      p_period_start,
    'period_end',        p_period_end,
    'currency_code',     COALESCE(v_currency, 'USD'),
    'base_minor',        v_total_base,
    'delegation_minor',  v_total_deleg,
    'extras_minor',      v_total_extras,
    'total_minor',       v_total_base + v_total_deleg + v_total_extras,
    'cages',             v_breakdown
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_researcher_billing(date, date) TO authenticated;

-- ============================================================
-- 3. get_pi_billing — per-researcher rollup for a lab
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_pi_billing(
  p_lab_id       uuid,
  p_period_start date,
  p_period_end   date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     public.user_role;
  v_currency text;
  v_result   jsonb;
BEGIN
  v_role := public.role_in_lab(p_lab_id);
  IF v_role IS NULL
     OR v_role NOT IN ('pi'::public.user_role, 'lab_manager'::public.user_role)
  THEN
    RAISE EXCEPTION 'not_authorized_for_lab_billing'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT f.currency_code INTO v_currency
    FROM public.labs l
    LEFT JOIN public.facilities f ON f.id = l.facility_id
   WHERE l.id = p_lab_id;

  WITH per_cage AS (
    SELECT
      c.id             AS cage_id,
      c.owner_user_id,
      cost.base_minor,
      cost.delegation_minor
    FROM public.cages c
    CROSS JOIN LATERAL public._billing_cage_cost(c.id, p_period_start, p_period_end) cost
    WHERE c.lab_id = p_lab_id
  ),
  per_cage_extras AS (
    SELECT pc.*,
      COALESCE((
        SELECT SUM(cs.amount_minor)::bigint
          FROM public.cage_services cs
         WHERE cs.cage_id = pc.cage_id
           AND cs.performed_at::date BETWEEN p_period_start AND p_period_end
      ), 0::bigint) AS extras_minor
    FROM per_cage pc
  ),
  per_researcher AS (
    SELECT
      owner_user_id,
      COUNT(*)                                            AS cage_count,
      COALESCE(SUM(base_minor), 0)::bigint                AS base_minor,
      COALESCE(SUM(delegation_minor), 0)::bigint          AS delegation_minor,
      COALESCE(SUM(extras_minor), 0)::bigint              AS extras_minor
    FROM per_cage_extras
    GROUP BY owner_user_id
  ),
  rows_with_names AS (
    SELECT
      pr.owner_user_id,
      COALESCE(p.full_name, p.email, 'Unassigned')        AS display_name,
      p.email                                              AS email,
      pr.cage_count,
      pr.base_minor,
      pr.delegation_minor,
      pr.extras_minor,
      pr.base_minor + pr.delegation_minor + pr.extras_minor AS total_minor
    FROM per_researcher pr
    LEFT JOIN public.profiles p ON p.id = pr.owner_user_id
  )
  SELECT jsonb_build_object(
    'lab_id',           p_lab_id,
    'period_start',     p_period_start,
    'period_end',       p_period_end,
    'currency_code',    COALESCE(v_currency, 'USD'),
    'grand_total_minor', COALESCE(SUM(total_minor), 0),
    'grand_base_minor', COALESCE(SUM(base_minor), 0),
    'grand_delegation_minor', COALESCE(SUM(delegation_minor), 0),
    'grand_extras_minor', COALESCE(SUM(extras_minor), 0),
    'researchers',      COALESCE(jsonb_agg(jsonb_build_object(
      'user_id',           owner_user_id,
      'display_name',      display_name,
      'email',             email,
      'cage_count',        cage_count,
      'base_minor',        base_minor,
      'delegation_minor',  delegation_minor,
      'extras_minor',      extras_minor,
      'total_minor',       total_minor
    ) ORDER BY total_minor DESC), '[]'::jsonb)
  )
  INTO v_result
  FROM rows_with_names;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pi_billing(uuid, date, date) TO authenticated;

-- ============================================================
-- 4. get_vet_facility_revenue — per-lab rollup for a facility
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_vet_facility_revenue(
  p_facility_id  uuid,
  p_period_start date,
  p_period_end   date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role     public.user_role;
  v_currency text;
  v_result   jsonb;
BEGIN
  v_role := public.role_in_facility(p_facility_id);
  IF v_role IS NULL
     OR v_role NOT IN ('facility_vet'::public.user_role, 'facility_manager'::public.user_role)
  THEN
    RAISE EXCEPTION 'not_authorized_for_facility_revenue'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT currency_code INTO v_currency
    FROM public.facilities WHERE id = p_facility_id;

  WITH per_cage AS (
    SELECT
      c.id      AS cage_id,
      c.lab_id,
      cost.base_minor,
      cost.delegation_minor
    FROM public.cages c
    JOIN public.labs l ON l.id = c.lab_id
    CROSS JOIN LATERAL public._billing_cage_cost(c.id, p_period_start, p_period_end) cost
    WHERE l.facility_id = p_facility_id
  ),
  per_cage_extras AS (
    SELECT pc.*,
      COALESCE((
        SELECT SUM(cs.amount_minor)::bigint
          FROM public.cage_services cs
         WHERE cs.cage_id = pc.cage_id
           AND cs.performed_at::date BETWEEN p_period_start AND p_period_end
      ), 0::bigint) AS extras_minor
    FROM per_cage pc
  ),
  per_lab AS (
    SELECT
      lab_id,
      COUNT(*)                                            AS cage_count,
      COALESCE(SUM(base_minor), 0)::bigint                AS base_minor,
      COALESCE(SUM(delegation_minor), 0)::bigint          AS delegation_minor,
      COALESCE(SUM(extras_minor), 0)::bigint              AS extras_minor
    FROM per_cage_extras
    GROUP BY lab_id
  ),
  rows_with_names AS (
    SELECT
      pl.lab_id,
      l.name                                              AS lab_name,
      pl.cage_count,
      pl.base_minor,
      pl.delegation_minor,
      pl.extras_minor,
      pl.base_minor + pl.delegation_minor + pl.extras_minor AS total_minor
    FROM per_lab pl
    LEFT JOIN public.labs l ON l.id = pl.lab_id
  )
  SELECT jsonb_build_object(
    'facility_id',            p_facility_id,
    'period_start',           p_period_start,
    'period_end',             p_period_end,
    'currency_code',          COALESCE(v_currency, 'USD'),
    'grand_total_minor',      COALESCE(SUM(total_minor), 0),
    'grand_base_minor',       COALESCE(SUM(base_minor), 0),
    'grand_delegation_minor', COALESCE(SUM(delegation_minor), 0),
    'grand_extras_minor',     COALESCE(SUM(extras_minor), 0),
    'labs',                   COALESCE(jsonb_agg(jsonb_build_object(
      'lab_id',           lab_id,
      'lab_name',         lab_name,
      'cage_count',       cage_count,
      'base_minor',       base_minor,
      'delegation_minor', delegation_minor,
      'extras_minor',     extras_minor,
      'total_minor',      total_minor
    ) ORDER BY total_minor DESC), '[]'::jsonb)
  )
  INTO v_result
  FROM rows_with_names;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vet_facility_revenue(uuid, date, date) TO authenticated;

-- ============================================================
-- Verify (paste-runner sanity checks)
-- ============================================================
-- NOTE: no smoke test here that CALLS get_researcher_billing().
-- Supabase's SQL editor runs as postgres with no auth.uid(), so the
-- 'not_signed_in' guard fires and — because the editor wraps runs in
-- a single transaction — the failure rolls back all the CREATE
-- FUNCTIONs above. Verify by counting registrations instead; the
-- RPCs work when called from the app with a real JWT.
SELECT COUNT(*) AS rpcs_registered
  FROM pg_proc
 WHERE proname IN (
   '_billing_cage_cost',
   'get_researcher_billing',
   'get_pi_billing',
   'get_vet_facility_revenue'
 );
