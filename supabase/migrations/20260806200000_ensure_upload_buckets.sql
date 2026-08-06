-- Storage policies existed before the buckets themselves, which caused
-- NoSuchBucket errors on project media and guarantee document uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('community-media', 'community-media', false, 26214400),
  ('kyc-documents', 'kyc-documents', false, 26214400)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Guarantee/project documents are private and scoped to the user's folder.
DROP POLICY IF EXISTS "kyc_documents_insert_own" ON storage.objects;
CREATE POLICY "kyc_documents_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc_documents_read_own" ON storage.objects;
CREATE POLICY "kyc_documents_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc_documents_delete_own" ON storage.objects;
CREATE POLICY "kyc_documents_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
