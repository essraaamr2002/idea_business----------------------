
CREATE POLICY "kyc_signatures user upload own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kyc-signatures' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc_signatures user read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-signatures' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
