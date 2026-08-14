-- 0019_flag_system_schema.sql
-- Workstream IV-1: Facility staff flag cages, PI reviews and resolves.
-- Three tables:
--   * flag_types                — registry of flag categories (seeded
--                                 in 0021 with 14 built-ins)
--   * cage_flags                — a flag against a specific cage
--   * cage_flag_attachments     — photos attached to a flag
--
-- Authority model (RLS):
--   * flag_types                — everyone signed in reads; nobody
--                                 writes via API (seed-only).
--   * cage_flags                — SELECT via can_read_lab (lab
--                                 members + facility overseers).
--                                 INSERT via is_facility_overseer_of_lab
--                                 (this is the vet/facility feature —
--                                 lab members flagging their own
--                                 cages is out of scope for MVP; if
--                                 they want to note something, use
--                                 observations).
--                                 UPDATE via lab member OR facility
--                                 overseer (both can resolve).
--                                 No DELETE (audit trail — resolved
--                                 flags stay put).
--   * cage_flag_attachments     — scoped by parent flag's lab.

-- ============================================================
-- 1. flag_types
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flag_types (
  id                text PRIMARY KEY,         -- 'sick_animal', 'overcrowded', etc.
  label             text NOT NULL,            -- Human display
  description       text,                     -- Help text for the picker
  icon              text NOT NULL,            -- Semantic id — clients map to their icon set
  default_severity  text NOT NULL
                    CHECK (default_severity IN ('urgent', 'attention', 'info')),
  sort_order        int NOT NULL DEFAULT 100,
  system            boolean NOT NULL DEFAULT true,  -- built-in vs future user-added
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flag_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flag_types_read_all" ON public.flag_types;
CREATE POLICY "flag_types_read_all" ON public.flag_types
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.flag_types TO authenticated, anon;

-- ============================================================
-- 2. cage_flags
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cage_flags (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id            uuid NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  lab_id             uuid NOT NULL REFERENCES public.labs(id)  ON DELETE CASCADE,
  flag_type          text NOT NULL REFERENCES public.flag_types(id),
  severity           text NOT NULL DEFAULT 'attention'
                     CHECK (severity IN ('urgent', 'attention', 'info')),
  notes              text,
  -- Nullable + ON DELETE SET NULL so account deletion doesn't
  -- cascade-delete flag history — attribution just becomes anonymous.
  -- DEFAULT auth.uid() means clients don't need to pass this on insert.
  flagged_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL
                     DEFAULT auth.uid(),
  resolved           boolean NOT NULL DEFAULT false,
  resolved_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at        timestamptz,
  resolution_notes   text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Denormalized lab_id lets RLS run without a join into cages. But
-- keep them in sync: if a cage moves labs, its flags follow. Handled
-- by trigger below.
CREATE OR REPLACE FUNCTION public.sync_cage_flag_lab_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On insert, if lab_id wasn't provided, pull it from the parent cage.
  IF NEW.lab_id IS NULL THEN
    SELECT lab_id INTO NEW.lab_id FROM public.cages WHERE id = NEW.cage_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cage_flags_sync_lab_id ON public.cage_flags;
CREATE TRIGGER cage_flags_sync_lab_id
  BEFORE INSERT ON public.cage_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_cage_flag_lab_id();

CREATE INDEX IF NOT EXISTS cage_flags_cage_id_idx
  ON public.cage_flags (cage_id);

CREATE INDEX IF NOT EXISTS cage_flags_lab_unresolved_idx
  ON public.cage_flags (lab_id, created_at DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS cage_flags_urgent_unresolved_idx
  ON public.cage_flags (lab_id, created_at DESC)
  WHERE resolved = false AND severity = 'urgent';

ALTER TABLE public.cage_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cage_flags_select_lab_or_facility" ON public.cage_flags;
CREATE POLICY "cage_flags_select_lab_or_facility" ON public.cage_flags
  FOR SELECT
  TO authenticated
  USING (public.can_read_lab(lab_id));

DROP POLICY IF EXISTS "cage_flags_insert_facility_overseer" ON public.cage_flags;
CREATE POLICY "cage_flags_insert_facility_overseer" ON public.cage_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_facility_overseer_of_lab(lab_id));

-- UPDATE: any lab member OR facility overseer can resolve/reopen.
-- The client is trusted to only touch resolution fields; a future
-- audit trigger (VII-1) will log the diff.
DROP POLICY IF EXISTS "cage_flags_update_member_or_overseer" ON public.cage_flags;
CREATE POLICY "cage_flags_update_member_or_overseer" ON public.cage_flags
  FOR UPDATE
  TO authenticated
  USING      (public.can_write_lab(lab_id) OR public.is_facility_overseer_of_lab(lab_id))
  WITH CHECK (public.can_write_lab(lab_id) OR public.is_facility_overseer_of_lab(lab_id));

-- No DELETE policy — flags are immutable history.

GRANT SELECT, INSERT, UPDATE ON public.cage_flags TO authenticated;

-- ============================================================
-- 3. cage_flag_attachments
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cage_flag_attachments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id        uuid NOT NULL REFERENCES public.cage_flags(id) ON DELETE CASCADE,
  file_path      text NOT NULL,             -- Path within the storage bucket
  content_type   text,                      -- e.g. 'image/jpeg'
  size_bytes     int,
  caption        text,
  uploaded_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL
                 DEFAULT auth.uid(),
  uploaded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfa_flag_id_idx
  ON public.cage_flag_attachments (flag_id);

ALTER TABLE public.cage_flag_attachments ENABLE ROW LEVEL SECURITY;

-- Scope by the parent flag's lab. All three policies use the same
-- subquery pattern; kept explicit for readability.
DROP POLICY IF EXISTS "cfa_select_lab_or_facility" ON public.cage_flag_attachments;
CREATE POLICY "cfa_select_lab_or_facility" ON public.cage_flag_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cage_flags cf
      WHERE cf.id = flag_id
        AND public.can_read_lab(cf.lab_id)
    )
  );

DROP POLICY IF EXISTS "cfa_insert_facility_overseer" ON public.cage_flag_attachments;
CREATE POLICY "cfa_insert_facility_overseer" ON public.cage_flag_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cage_flags cf
      WHERE cf.id = flag_id
        AND public.is_facility_overseer_of_lab(cf.lab_id)
    )
  );

-- No UPDATE / DELETE — attachments are immutable.

GRANT SELECT, INSERT ON public.cage_flag_attachments TO authenticated;
