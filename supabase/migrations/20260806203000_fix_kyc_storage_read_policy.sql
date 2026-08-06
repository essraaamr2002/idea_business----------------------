-- Do not call is_admin_staff() from a client-facing Storage policy.
-- Regular users only need access to objects inside their own folder.
-- Staff access is performed by trusted server functions with service_role.
DROP POLICY IF EXISTS "kyc_documents_read_own_or_staff" ON storage.objects;
DROP POLICY IF EXISTS "kyc_documents_read_own" ON storage.objects;

CREATE POLICY "kyc_documents_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
