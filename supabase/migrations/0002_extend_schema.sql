-- 0002_extend_schema.sql
-- Aligns the live schema with what the dashboard code already expects:
--   1. Adds missing user_role enum values (lab_manager, facility_vet, facility_manager)
--   2. Adds profiles.lab_settings JSONB column (used by the settings page)
--   3. Adds helper functions my_lab_id() and my_role() for use in RLS policies
--
-- Split from RLS policies because Postgres requires new enum values to be
-- committed before they can be referenced in queries (e.g. in policy bodies).

-- 1. Enum extensions
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'lab_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'facility_vet';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'facility_manager';

-- 2. Lab settings JSONB column on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lab_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Helper functions for RLS
CREATE OR REPLACE FUNCTION public.my_lab_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT lab_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.my_lab_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_role() TO anon, authenticated;
