
CREATE POLICY "kyc read own files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='kyc-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc upload own files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='kyc-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "kyc admin read all" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='kyc-documents' AND public.has_role(auth.uid(),'admin'));
