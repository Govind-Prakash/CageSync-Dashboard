-- 0008_multilab_schema.sql
-- Adds the foundation tables for multi-lab membership and facility-level
-- oversight. Purely additive: no existing column is altered, no existing
-- RLS policy is touched, no application code needs to change yet. New
-- tables sit dormant until follow-up migrations rewire helpers and RLS.
--
-- Once subsequent migrations land:
--   * profiles.lab_id  → becomes "active lab" (which lab user is viewing)
--   * lab_memberships  → source of truth for what labs a user belongs to
--   * facility_*       → for vets / facility managers overseeing many labs

-- ============================================================================
-- 1. facilities — top-level grouping of labs (e.g. a vivarium building)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facilities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  institution  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

-- Optional FK from labs back to their containing facility.
ALTER TABLE public.labs
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES public.facilities(id) ON DELETE SET NULL;

-- ============================================================================
-- 2. lab_memberships — many-to-many: which users belong to which labs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lab_memberships (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lab_id      uuid NOT NULL REFERENCES public.labs(id)     ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'researcher'::public.user_role,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  joined_via  text,  -- 'invite' | 'bootstrap' | 'manual' — audit trail
  PRIMARY KEY (user_id, lab_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_memberships_lab    ON public.lab_memberships(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_memberships_user   ON public.lab_memberships(user_id);

ALTER TABLE public.lab_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. facility_memberships — which users oversee which facilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.facility_memberships (
  user_id      uuid NOT NULL REFERENCES public.profiles(id)   ON DELETE CASCADE,
  facility_id  uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  role         public.user_role NOT NULL DEFAULT 'facility_vet'::public.user_role,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_memberships_facility
  ON public.facility_memberships(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_memberships_user
  ON public.facility_memberships(user_id);

ALTER TABLE public.facility_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Backfill — give every existing user-with-a-lab a corresponding
--    lab_membership row, so Sub-step 3's RLS rewrite doesn't lock anyone
--    out the moment it ships.
-- ============================================================================
INSERT INTO public.lab_memberships (user_id, lab_id, role, joined_via)
SELECT id,
       lab_id,
       COALESCE(role, 'researcher'::public.user_role),
       'bootstrap'
FROM public.profiles
WHERE lab_id IS NOT NULL
ON CONFLICT (user_id, lab_id) DO NOTHING;
