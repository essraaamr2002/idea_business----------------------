
CREATE POLICY "provider_kyc_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provider_kyc_own_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provider_kyc_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provider_kyc_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'provider-kyc' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "provider_kyc_admin_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'provider-kyc' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'provider-kyc' AND public.has_role(auth.uid(),'admin'));
