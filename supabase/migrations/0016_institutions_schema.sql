-- 0016_institutions_schema.sql
-- Workstream II-1: Institution registry + campus + email-domain
-- verification. Prerequisite for the facility feature (Workstream III)
-- and for domain-verified lab search (II-5).
--
-- Adds:
--   * institutions           — the registry itself
--   * labs.institution_id    — proper FK, replacing the free-text
--                              `labs.institution` column (kept for one
--                              release cycle as a fallback)
--   * labs.campus            — which campus of the institution
--   * labs.discoverable      — whether facility search can see this lab
--   * facilities.institution_id + facilities.campus — same idea for
--                              facilities
--   * user_institution_verifications — proves a user is affiliated with
--                              a given institution (via email domain
--                              match at signup or via email-code
--                              verification later)
--   * email_verification_codes — 6-digit codes for the fallback path
--                              (II-4). Included in this migration to
--                              keep the schema self-contained.
--
-- Nothing user-visible ships yet. Seed data lands in 0017; trigger
-- extension lands in 0018.

-- ============================================================
-- 1. institutions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,       -- Official long form
  common_name    text NOT NULL,       -- Short form used for search/display
  country        text NOT NULL,       -- ISO country name for grouping
  campuses       text[],              -- NULL = single-location institution
  email_domains  text[] NOT NULL,     -- Verified institutional domains
  status         text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'pending_review', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS institutions_canonical_name_uidx
  ON public.institutions (canonical_name);

-- GIN index for `NEW.email domain = ANY(email_domains)` lookup in
-- handle_new_user (0018) and for admin queries. text[] GIN supports
-- the `@>` and `= ANY(...)` operators.
CREATE INDEX IF NOT EXISTS institutions_email_domains_gin
  ON public.institutions
  USING gin (email_domains);

-- tsvector index on names for the future autocomplete search RPC.
-- We keep this on both name columns because users search by both.
CREATE INDEX IF NOT EXISTS institutions_names_fts
  ON public.institutions
  USING gin (to_tsvector('simple', coalesce(canonical_name, '') || ' ' || coalesce(common_name, '')));

-- RLS: everyone signed in can read; nobody can write via API. Seed
-- data + admin curation only via SECURITY DEFINER RPCs (deferred).
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institutions_read_all" ON public.institutions;
CREATE POLICY "institutions_read_all" ON public.institutions
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- No INSERT/UPDATE/DELETE policies means writes are rejected for
-- authenticated + anon. service_role bypasses RLS for seeding.

GRANT SELECT ON public.institutions TO authenticated, anon;

-- ============================================================
-- 2. Extend labs
-- ============================================================

ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campus         text,
  ADD COLUMN IF NOT EXISTS discoverable   boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS labs_institution_id_idx
  ON public.labs (institution_id)
  WHERE institution_id IS NOT NULL;

-- Note: legacy `labs.institution` text column stays. Backfill /
-- deprecation is a future migration once the picker has been the
-- write path for at least one release cycle.

-- ============================================================
-- 3. Extend facilities
-- ============================================================

ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campus         text;

CREATE INDEX IF NOT EXISTS facilities_institution_id_idx
  ON public.facilities (institution_id)
  WHERE institution_id IS NOT NULL;

-- ============================================================
-- 4. user_institution_verifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_institution_verifications (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  verified_via    text NOT NULL
                  CHECK (verified_via IN ('email_domain', 'email_code', 'admin_grant')),
  verified_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, institution_id)
);

CREATE INDEX IF NOT EXISTS uiv_institution_id_idx
  ON public.user_institution_verifications (institution_id);

ALTER TABLE public.user_institution_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uiv_read_own" ON public.user_institution_verifications;
CREATE POLICY "uiv_read_own" ON public.user_institution_verifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for authenticated. Writes go through the
-- handle_new_user trigger (0018) and the verify_institution_code RPC
-- (II-4), both SECURITY DEFINER.

GRANT SELECT ON public.user_institution_verifications TO authenticated;

-- ============================================================
-- 5. email_verification_codes  (backing store for II-4 fallback)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_verification_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id  uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  email           text NOT NULL,
  code_hash       text NOT NULL,      -- sha256 of the 6-digit code
  expires_at      timestamptz NOT NULL,
  attempts        int NOT NULL DEFAULT 0,
  used            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evc_lookup_idx
  ON public.email_verification_codes (user_id, institution_id, used, expires_at);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- No policies at all. All access via SECURITY DEFINER RPCs so we can
-- rate-limit + hash without leaking raw codes.

GRANT SELECT ON public.email_verification_codes TO authenticated;
