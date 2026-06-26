-- 0005_grant_table_permissions.sql
-- Restores the standard Supabase table grants for anon, authenticated, and
-- service_role on every table in the public schema, plus default privileges
-- so future tables inherit them automatically.
--
-- Without these grants, every INSERT/UPDATE/DELETE/SELECT from the Flutter
-- app and the dashboard gets rejected by Postgres BEFORE reaching RLS —
-- "permission denied for table cages". RLS only kicks in after base
-- privileges are granted; it then handles row-level access control.
--
-- Why missing? The original schema dump (0001) only emitted grants for
-- `profiles`. The other tables were created in the Supabase dashboard
-- before grants were normalized; our additive migrations (0002-0004) also
-- didn't grant. This migration fixes both past and future tables.

-- Current tables
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Future tables in this schema inherit the same grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
