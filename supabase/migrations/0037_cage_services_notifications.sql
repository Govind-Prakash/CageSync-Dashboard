-- 0037_cage_services_notifications.sql
-- Workstream IX-3: vet's ad-hoc billable services + PI notifications.
--
-- What this adds:
--   1. cage_services — one row per billable action the vet performs
--      on a cage (procedure, extra care, weekend care, etc.). Amount
--      is stored in minor units + currency_code snapshotted at time
--      of service (so past rows stay correct even if the facility
--      changes currency later).
--   2. billing_notifications — in-app inbox rows. One insert into
--      cage_services fires the trigger below and drops rows for the
--      cage owner AND (if different) the lab PI.
--   3. log_cage_service(...) RPC — the vet's write path. Auto-fills
--      billed_to from cage.owner_user_id and currency_code from the
--      lab's facility. Gated to facility_vet / facility_manager of
--      the facility the cage's lab is affiliated with.
--   4. Realtime publication for billing_notifications so IX-8 can
--      show live toasts without a follow-up migration.
--
-- Idempotent. Purely additive.

-- ============================================================
-- 1. cage_services
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cage_services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id        uuid NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  performed_by   uuid REFERENCES public.profiles(id),
  billed_to      uuid REFERENCES public.profiles(id),
  service_type   text NOT NULL,
  description    text,
  amount_minor   int  NOT NULL CHECK (amount_minor >= 0),
  currency_code  text NOT NULL,
  performed_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cage_services_cage        ON public.cage_services(cage_id);
CREATE INDEX IF NOT EXISTS idx_cage_services_billed_to   ON public.cage_services(billed_to);
CREATE INDEX IF NOT EXISTS idx_cage_services_performed_at ON public.cage_services(performed_at DESC);

ALTER TABLE public.cage_services ENABLE ROW LEVEL SECURITY;

-- SELECT: cage owner, PI/lab_manager of the lab, or facility staff.
DROP POLICY IF EXISTS "cage_services_select" ON public.cage_services;
CREATE POLICY "cage_services_select"
  ON public.cage_services
  FOR SELECT
  TO authenticated
  USING (
    billed_to = auth.uid()
    OR EXISTS (
      SELECT 1
        FROM public.cages c
        JOIN public.lab_memberships lm ON lm.lab_id = c.lab_id
       WHERE c.id = cage_services.cage_id
         AND lm.user_id = auth.uid()
         AND lm.role IN (
           'pi'::public.user_role,
           'lab_manager'::public.user_role
         )
    )
    OR EXISTS (
      SELECT 1
        FROM public.cages c
        JOIN public.labs  l  ON l.id = c.lab_id
        JOIN public.facility_memberships fm ON fm.facility_id = l.facility_id
       WHERE c.id = cage_services.cage_id
         AND fm.user_id = auth.uid()
    )
  );

-- No direct INSERT/UPDATE/DELETE policies. Writes go through
-- log_cage_service() below, which enforces the vet-only gate.

-- ============================================================
-- 2. billing_notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.billing_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind               text NOT NULL,           -- 'vet_service_added'
  cage_service_id    uuid REFERENCES public.cage_services(id) ON DELETE CASCADE,
  read_at            timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_notifications_recipient
  ON public.billing_notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_notifications_unread
  ON public.billing_notifications(recipient_user_id)
 WHERE read_at IS NULL;

ALTER TABLE public.billing_notifications ENABLE ROW LEVEL SECURITY;

-- Recipient can read + mark their own notifications read.
DROP POLICY IF EXISTS "billing_notifications_select" ON public.billing_notifications;
CREATE POLICY "billing_notifications_select"
  ON public.billing_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "billing_notifications_update_own" ON public.billing_notifications;
CREATE POLICY "billing_notifications_update_own"
  ON public.billing_notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- No direct INSERT policy — rows are inserted only by the trigger
-- below (which runs as table-owner and bypasses RLS).

-- ============================================================
-- 3. Trigger: notify on new cage_service
-- ============================================================
-- Drops rows for the cage owner AND (if different) the lab PI, so
-- both parties see the charge appear in their inbox.

CREATE OR REPLACE FUNCTION public.tg_notify_billing_on_cage_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab_id  uuid;
  v_pi_id   uuid;
BEGIN
  -- Notify the person being billed (usually the researcher/owner).
  IF NEW.billed_to IS NOT NULL THEN
    INSERT INTO public.billing_notifications
      (recipient_user_id, kind, cage_service_id)
    VALUES
      (NEW.billed_to, 'vet_service_added', NEW.id);
  END IF;

  -- Also notify the lab PI if they're not the same person.
  SELECT c.lab_id INTO v_lab_id
    FROM public.cages c WHERE c.id = NEW.cage_id;

  IF v_lab_id IS NOT NULL THEN
    SELECT lm.user_id INTO v_pi_id
      FROM public.lab_memberships lm
     WHERE lm.lab_id = v_lab_id
       AND lm.role   = 'pi'::public.user_role
     ORDER BY lm.joined_at NULLS LAST, lm.user_id
     LIMIT 1;

    IF v_pi_id IS NOT NULL AND v_pi_id IS DISTINCT FROM NEW.billed_to THEN
      INSERT INTO public.billing_notifications
        (recipient_user_id, kind, cage_service_id)
      VALUES
        (v_pi_id, 'vet_service_added', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_billing ON public.cage_services;
CREATE TRIGGER trg_notify_billing
  AFTER INSERT ON public.cage_services
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_notify_billing_on_cage_service();

-- ============================================================
-- 4. RPC: log a service (vet's write path)
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_cage_service(
  p_cage_id      uuid,
  p_service_type text,
  p_description  text,
  p_amount_minor int,
  p_performed_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lab_id        uuid;
  v_facility_id   uuid;
  v_owner_id      uuid;
  v_currency      text;
  v_role          public.user_role;
  v_service_id    uuid;
BEGIN
  SELECT c.lab_id, c.owner_user_id, l.facility_id, f.currency_code
    INTO v_lab_id, v_owner_id, v_facility_id, v_currency
    FROM public.cages c
    LEFT JOIN public.labs       l ON l.id = c.lab_id
    LEFT JOIN public.facilities f ON f.id = l.facility_id
   WHERE c.id = p_cage_id;

  IF v_lab_id IS NULL THEN
    RAISE EXCEPTION 'cage_not_found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_facility_id IS NULL THEN
    RAISE EXCEPTION 'cage_lab_has_no_facility'
      USING ERRCODE = 'foreign_key_violation',
            HINT   = 'The lab must be affiliated with a facility before vet services can be billed.';
  END IF;

  v_role := public.role_in_facility(v_facility_id);
  IF v_role IS NULL
     OR v_role NOT IN (
       'facility_vet'::public.user_role,
       'facility_manager'::public.user_role
     )
  THEN
    RAISE EXCEPTION 'not_authorized_to_log_service'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount_minor < 0 THEN
    RAISE EXCEPTION 'amount_must_be_non_negative'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_service_type IS NULL OR length(trim(p_service_type)) = 0 THEN
    RAISE EXCEPTION 'service_type_required'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.cage_services
    (cage_id, performed_by, billed_to,
     service_type, description, amount_minor, currency_code,
     performed_at)
  VALUES
    (p_cage_id, auth.uid(), v_owner_id,
     p_service_type, p_description, p_amount_minor, COALESCE(v_currency, 'USD'),
     p_performed_at)
  RETURNING id INTO v_service_id;

  RETURN jsonb_build_object(
    'success',       true,
    'service_id',    v_service_id,
    'billed_to',     v_owner_id,
    'currency_code', COALESCE(v_currency, 'USD')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_cage_service(uuid, text, text, int, timestamptz)
  TO authenticated;

-- ============================================================
-- 5. Realtime publication for billing_notifications
-- ============================================================
-- Wrapped so re-running after Supabase has already registered the
-- publication doesn't error.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'billing_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.billing_notifications;
  END IF;
END;
$$;

-- ============================================================
-- Verify (paste-runner sanity checks)
-- ============================================================
SELECT COUNT(*) AS cage_services_table_exists
  FROM information_schema.tables
 WHERE table_name = 'cage_services';

SELECT COUNT(*) AS billing_notifications_table_exists
  FROM information_schema.tables
 WHERE table_name = 'billing_notifications';

SELECT COUNT(*) AS trigger_registered
  FROM pg_trigger
 WHERE tgname = 'trg_notify_billing';

SELECT COUNT(*) AS rpc_registered
  FROM pg_proc
 WHERE proname = 'log_cage_service';

SELECT COUNT(*) AS realtime_publishes_notifications
  FROM pg_publication_tables
 WHERE pubname = 'supabase_realtime'
   AND tablename = 'billing_notifications';
