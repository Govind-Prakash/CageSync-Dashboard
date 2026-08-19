-- 0023_relax_cage_flags_insert.sql
-- Workstream IV-4 unblocker: cage_flags INSERT was originally
-- restricted to `is_facility_overseer_of_lab(lab_id)` on the theory
-- that flags are purely a facility → lab signaling channel. In
-- practice no user is a facility overseer today (Workstream III
-- ships facility affiliations later) so the flag UI would 403 for
-- everyone. Relax the policy to also allow the writing tier of the
-- lab itself — lab_manager, researcher, pi (technician per the
-- existing can_write_lab ladder).
--
-- Facility overseers keep INSERT rights; this is additive.
--
-- Idempotent.

DROP POLICY IF EXISTS "cage_flags_insert_facility_overseer" ON public.cage_flags;
DROP POLICY IF EXISTS "cage_flags_insert_lab_or_facility"   ON public.cage_flags;

CREATE POLICY "cage_flags_insert_lab_or_facility" ON public.cage_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_write_lab(lab_id)
    OR public.is_facility_overseer_of_lab(lab_id)
  );

-- Same relax for cage_flag_attachments so the photos upload path
-- isn't the new bottleneck.
DROP POLICY IF EXISTS "cfa_insert_facility_overseer" ON public.cage_flag_attachments;
DROP POLICY IF EXISTS "cfa_insert_lab_or_facility"   ON public.cage_flag_attachments;

CREATE POLICY "cfa_insert_lab_or_facility" ON public.cage_flag_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cage_flags cf
       WHERE cf.id = flag_id
         AND (public.can_write_lab(cf.lab_id)
              OR public.is_facility_overseer_of_lab(cf.lab_id))
    )
  );

-- Storage bucket policy for flag-attachments/flags/{flag_id}/*
-- also needs to widen. Rewrite it in place.

DROP POLICY IF EXISTS "flag_attachments_upload" ON storage.objects;
CREATE POLICY "flag_attachments_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'flag-attachments'
    AND EXISTS (
      SELECT 1 FROM public.cage_flags cf
       WHERE cf.id::text = split_part(name, '/', 2)
         AND (public.can_write_lab(cf.lab_id)
              OR public.is_facility_overseer_of_lab(cf.lab_id))
    )
  );
