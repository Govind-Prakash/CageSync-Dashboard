-- 0004_align_with_flutter.sql
-- Brings the Supabase schema into structural parity with the Flutter SQLite schema.
-- All additive: every new column is nullable or has a default, every new table is
-- standalone. Existing dashboard reads (`select('*')`) keep working unchanged.
--
-- Decisions encoded:
--   * Keep ALL Flutter-only fields on Supabase too (user pref: "keep both, both sides")
--   * Create `litters` mirroring Flutter's lifecycle table (Supabase had only `breeding_pairs`)
--   * Create `records` mirroring Flutter's generic event log
--   * Add `drug`/`given_at` as nullable companions to `substance`/`administered_at`
--     (sync layer will reconcile later — UI on each side keeps writing to its own field)
--   * `unit` added to treatments (Flutter has it; Supabase didn't)
--   * RLS policies match the v1 lab-scoped pattern from 0003

-- ============================================================================
-- CAGES: add every Flutter-only column
-- ============================================================================
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS barcode         text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS cage_type       text DEFAULT 'experimental';
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS dam2_id         text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS dam2_genotype   text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS breeding_scheme text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS genotype        text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS species         text;
ALTER TABLE public.cages ADD COLUMN IF NOT EXISTS location        text;

-- ============================================================================
-- TREATMENTS: add Flutter-only fields and rename-companions
-- ============================================================================
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS unit       text;
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS drug       text;
ALTER TABLE public.treatments ADD COLUMN IF NOT EXISTS given_at   timestamp with time zone;

-- treatment_type is currently NOT NULL on the live schema, but it isn't meaningful
-- to the Flutter side. Make it optional so Flutter-originated inserts don't fail.
ALTER TABLE public.treatments ALTER COLUMN treatment_type DROP NOT NULL;
ALTER TABLE public.treatments ALTER COLUMN administered_at DROP NOT NULL;

-- ============================================================================
-- LITTERS: new table mirroring Flutter schema (with multi-tenancy + timestamps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.litters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id           uuid REFERENCES public.labs(id) ON DELETE CASCADE,
  cage_id          uuid REFERENCES public.cages(id) ON DELETE SET NULL,
  pup_count        integer,
  dob              date,
  wean_date        date,
  father_genotype  text,
  mother_genotype  text,
  notes            text,
  litter_number    integer DEFAULT 1,
  status           text    DEFAULT 'nursing',
  weaned_count     integer DEFAULT 0,
  weaned_date      date,
  deceased_count   integer DEFAULT 0,
  dam2_id          text,
  dam2_genotype    text,
  created_at       timestamp with time zone DEFAULT now(),
  updated_at       timestamp with time zone DEFAULT now()
);

ALTER TABLE public.litters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "litters_select_lab"
  ON public.litters FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "litters_write_lab_non_observer"
  ON public.litters FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);

-- ============================================================================
-- RECORDS: new table mirroring Flutter's generic event log
-- (synced_to_sheet is intentionally NOT mirrored — it's a Flutter-local sync flag)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id       uuid REFERENCES public.labs(id) ON DELETE CASCADE,
  cage_id      uuid REFERENCES public.cages(id) ON DELETE CASCADE,
  type         text,
  value        text,
  recorded_at  timestamp with time zone,
  notes        text,
  recorded_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamp with time zone DEFAULT now()
);

ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "records_select_lab"
  ON public.records FOR SELECT TO authenticated
  USING (lab_id = public.my_lab_id());

CREATE POLICY "records_write_lab_non_observer"
  ON public.records FOR ALL TO authenticated
  USING (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role)
  WITH CHECK (lab_id = public.my_lab_id() AND public.my_role() <> 'observer'::public.user_role);
