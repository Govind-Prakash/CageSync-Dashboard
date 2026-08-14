-- 0020_flag_attachments_storage_bucket.sql
-- Workstream IV-2: Photo storage backing cage_flag_attachments.
--
-- Bucket: `flag-attachments` (private — signed URLs only, no public
-- listing). Path convention agreed with the Flutter client:
--
--   flags/{flag_id}/{iso_timestamp}-{original_filename}
--
-- Policies parse the flag_id out of the path and check the parent
-- cage_flags row for authorization.
--
-- Idempotent — safe to re-apply.

-- 1. Create the bucket if missing.
INSERT INTO storage.buckets (id, name, public)
VALUES ('flag-attachments', 'flag-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies on storage.objects for this bucket.
--
-- Path parsing: split_part(name, '/', 2) yields the flag_id segment
-- from 'flags/{flag_id}/...'. If the path shape doesn't match, the
-- EXISTS subquery returns 0 rows and the policy denies.

DROP POLICY IF EXISTS "flag_attachments_upload" ON storage.objects;
CREATE POLICY "flag_attachments_upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'flag-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.cage_flags cf
       WHERE cf.id::text = split_part(name, '/', 2)
         AND public.is_facility_overseer_of_lab(cf.lab_id)
    )
  );

DROP POLICY IF EXISTS "flag_attachments_download" ON storage.objects;
CREATE POLICY "flag_attachments_download" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'flag-attachments'
    AND EXISTS (
      SELECT 1
        FROM public.cage_flags cf
       WHERE cf.id::text = split_part(name, '/', 2)
         AND public.can_read_lab(cf.lab_id)
    )
  );

-- No UPDATE / DELETE policies — photos are immutable once uploaded.
-- (Photo lifecycle policy for resolved flags is deferred; see
-- roadmap §7 open questions.)
