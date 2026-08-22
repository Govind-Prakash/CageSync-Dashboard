-- 0032_urgent_flag_notifications.sql
-- Workstream IV-7: instant email alert when a facility flags a cage
-- with severity='urgent'. Pattern: Postgres trigger enqueues one
-- notification row per lab PI/manager; a Vercel cron API route
-- reads unsent rows every minute and pushes them via Resend.
--
-- Ships:
--   * flag_notifications queue table + RLS
--   * enqueue_urgent_flag_notifications() trigger function
--   * AFTER INSERT trigger on cage_flags filtered to urgent rows
--
-- Idempotent.

-- ============================================================
-- 1. Queue table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flag_notifications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id            uuid NOT NULL REFERENCES public.cage_flags(id) ON DELETE CASCADE,
  recipient_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type  text NOT NULL DEFAULT 'urgent_flag_email'
                     CHECK (notification_type IN ('urgent_flag_email', 'daily_digest')),
  sent_at            timestamptz,
  error              text,
  attempts           int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Cron worker scans by "not yet sent + few attempts". Partial index
-- keeps the scan cheap even when the historical table grows large.
CREATE INDEX IF NOT EXISTS flag_notifications_pending_idx
  ON public.flag_notifications (created_at)
  WHERE sent_at IS NULL AND attempts < 5;

CREATE INDEX IF NOT EXISTS flag_notifications_flag_id_idx
  ON public.flag_notifications (flag_id);

ALTER TABLE public.flag_notifications ENABLE ROW LEVEL SECURITY;

-- Read: recipients can see their own row (useful for a future
-- "notification history" panel). Nobody else — this table can
-- leak org-structure info if opened wide.
DROP POLICY IF EXISTS "flag_notifications_read_own" ON public.flag_notifications;
CREATE POLICY "flag_notifications_read_own" ON public.flag_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

-- No API writes. Only the trigger enqueues (SECURITY DEFINER) and
-- only the cron worker updates via service_role. Grant SELECT to
-- authenticated so the read policy is effective.
GRANT SELECT ON public.flag_notifications TO authenticated;

-- ============================================================
-- 2. Enqueue trigger function
-- ============================================================
-- On INSERT into cage_flags: if severity='urgent', enqueue one
-- notification per lab PI or lab_manager. Other severities skip —
-- daily digest is a future extension.

CREATE OR REPLACE FUNCTION public.enqueue_urgent_flag_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.severity <> 'urgent' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.flag_notifications (flag_id, recipient_user_id)
  SELECT NEW.id, lm.user_id
    FROM public.lab_memberships lm
   WHERE lm.lab_id = NEW.lab_id
     AND lm.role IN (
       'pi'::public.user_role,
       'lab_manager'::public.user_role
     )
     -- Don't page the flagger about their own flag; facility staff
     -- who created it already know.
     AND lm.user_id IS DISTINCT FROM NEW.flagged_by
   ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Trigger
-- ============================================================

DROP TRIGGER IF EXISTS enqueue_urgent_flag_notifications ON public.cage_flags;
CREATE TRIGGER enqueue_urgent_flag_notifications
  AFTER INSERT ON public.cage_flags
  FOR EACH ROW
  WHEN (NEW.severity = 'urgent')
  EXECUTE FUNCTION public.enqueue_urgent_flag_notifications();
