-- 0035_facility_billing.sql
-- Workstream IX-1: facility-scoped billing foundation.
--
-- Rate-setter is the VET (facility side), not the PI. All amounts
-- are stored as integer "minor units" (cents/agorot/paise/etc.).
-- Display code divides by 100 for most currencies (JPY-like are
-- rare; if we add one, extend a currency divisor helper on the
-- client).
--
-- Adds:
--   1. facilities.currency_code — ISO 4217, default 'USD'.
--   2. facility_billing_rates — versioned rate history. Setting a
--      new rate = inserting a new row with a later effective_from.
--      Reads pick the latest row where effective_from <= target_date
--      so historical billing stays correct after price changes.
--   3. RLS: rates readable by any user whose lab is affiliated with
--      the facility OR who is a facility member (vet/manager).
--      Writable only via the set_facility_billing_rate RPC (gated
--      to facility_vet / facility_manager).
--   4. RPC set_facility_billing_rate — the vet's write path.
--   5. RPC set_facility_currency — for changing ISO code (rare).
--
-- Idempotent. Purely additive.

-- ============================================================
-- 1. Currency on facility
-- ============================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD';

-- ============================================================
-- 2. Versioned billing rates
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facility_billing_rates (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id                     uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  weekly_maintenance_minor        int  NOT NULL CHECK (weekly_maintenance_minor >= 0),
  vet_delegation_surcharge_minor  int  NOT NULL DEFAULT 0 CHECK (vet_delegation_surcharge_minor >= 0),
  effective_from                  date NOT NULL DEFAULT CURRENT_DATE,
  set_by                          uuid REFERENCES public.profiles(id),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (facility_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_facility_billing_rates_facility_effective
  ON public.facility_billing_rates(facility_id, effective_from DESC);

ALTER TABLE public.facility_billing_rates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS policies
-- ============================================================
-- SELECT: anyone touching the facility (either a facility member,
-- or a member of a lab that's affiliated with this facility).

DROP POLICY IF EXISTS "facility_billing_rates_select" ON public.facility_billing_rates;
CREATE POLICY "facility_billing_rates_select"
  ON public.facility_billing_rates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.facility_memberships fm
       WHERE fm.user_id = auth.uid()
         AND fm.facility_id = facility_billing_rates.facility_id
    )
    OR
    EXISTS (
      SELECT 1
        FROM public.lab_memberships lm
        JOIN public.labs           l ON l.id = lm.lab_id
       WHERE lm.user_id = auth.uid()
         AND l.facility_id = facility_billing_rates.facility_id
    )
  );

-- No direct INSERT/UPDATE/DELETE policies — writes go through
-- set_facility_billing_rate() SECURITY DEFINER RPC, which enforces
-- role_in_facility() ∈ {facility_vet, facility_manager}.

-- ============================================================
-- 4. RPC: set (or replace-for-today) a rate
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_facility_billing_rate(
  p_facility_id                    uuid,
  p_weekly_maintenance_minor       int,
  p_vet_delegation_surcharge_minor int,
  p_effective_from                 date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   public.user_role;
  v_row_id uuid;
BEGIN
  v_role := public.role_in_facility(p_facility_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'facility_vet'::public.user_role,
       'facility_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_for_billing_rates'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_weekly_maintenance_minor < 0
     OR p_vet_delegation_surcharge_minor < 0 THEN
    RAISE EXCEPTION 'amount_must_be_non_negative'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Upsert on (facility_id, effective_from): same-day corrections
  -- overwrite; a new day = a new row so history stays intact.
  INSERT INTO public.facility_billing_rates
    (facility_id, weekly_maintenance_minor,
     vet_delegation_surcharge_minor, effective_from, set_by)
  VALUES
    (p_facility_id, p_weekly_maintenance_minor,
     p_vet_delegation_surcharge_minor, p_effective_from, auth.uid())
  ON CONFLICT (facility_id, effective_from) DO UPDATE
    SET weekly_maintenance_minor       = EXCLUDED.weekly_maintenance_minor,
        vet_delegation_surcharge_minor = EXCLUDED.vet_delegation_surcharge_minor,
        set_by                         = EXCLUDED.set_by
  RETURNING id INTO v_row_id;

  RETURN jsonb_build_object('success', true, 'rate_id', v_row_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_facility_billing_rate(uuid, int, int, date)
  TO authenticated;

-- ============================================================
-- 5. RPC: change the facility currency (rare; changes going forward)
-- ============================================================
-- Existing cage_services rows keep their own currency_code column
-- (set from the facility at service time), so changing the facility
-- currency here does not rewrite history.

CREATE OR REPLACE FUNCTION public.set_facility_currency(
  p_facility_id   uuid,
  p_currency_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := public.role_in_facility(p_facility_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'facility_vet'::public.user_role,
       'facility_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_for_billing_rates'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_currency_code IS NULL OR length(p_currency_code) <> 3 THEN
    RAISE EXCEPTION 'invalid_currency_code'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.facilities
     SET currency_code = upper(p_currency_code),
         updated_at    = now()
   WHERE id = p_facility_id;

  RETURN jsonb_build_object('success', true, 'currency_code', upper(p_currency_code));
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_facility_currency(uuid, text)
  TO authenticated;

-- ============================================================
-- Verify (paste-runner sanity checks)
-- ============================================================
SELECT COUNT(*) AS currency_column_exists
  FROM information_schema.columns
 WHERE table_name = 'facilities' AND column_name = 'currency_code';

SELECT COUNT(*) AS billing_rates_table_exists
  FROM information_schema.tables
 WHERE table_name = 'facility_billing_rates';

SELECT COUNT(*) AS rpcs_registered
  FROM pg_proc
 WHERE proname IN ('set_facility_billing_rate', 'set_facility_currency');
