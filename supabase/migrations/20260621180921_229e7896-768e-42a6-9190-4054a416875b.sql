
-- Storage policies for ad-media bucket
CREATE POLICY "ad_media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'ad-media');

CREATE POLICY "ad_media_owner_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ad_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'ad-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "ad_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ad-media' AND (storage.foldername(name))[1] = auth.uid()::text);
