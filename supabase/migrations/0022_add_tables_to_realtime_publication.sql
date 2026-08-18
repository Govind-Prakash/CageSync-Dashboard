-- 0022_add_tables_to_realtime_publication.sql
-- Fix: the 5 core entities were never added to the `supabase_realtime`
-- publication. Flutter's RealtimeSyncService subscribed correctly and
-- Supabase RLS permitted reads, but no INSERT/UPDATE/DELETE events
-- were ever broadcast — the Postgres logical replication publication
-- didn't include these tables, so the WebSocket had nothing to send.
--
-- Symptom: cages added from the dashboard never reached the Flutter
-- app (see VIII-1 round-trip test 2026-08-15).
--
-- Also add `cage_flags` and `cage_flag_attachments` now so IV-6
-- (realtime flags) works on day one when we wire it up.
--
-- Idempotent: `pg_publication_tables` is checked and only missing
-- entries are added. Safe to re-apply.

DO $$
DECLARE
  t text;
  wanted text[] := ARRAY[
    'cages',
    'animals',
    'treatments',
    'litters',
    'records',
    'cage_flags',
    'cage_flag_attachments'
  ];
BEGIN
  FOREACH t IN ARRAY wanted LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
