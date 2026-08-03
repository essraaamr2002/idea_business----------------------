
-- KYC enhancements for Binance-style wizard
ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS document_back_url TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS extracted_name TEXT,
  ADD COLUMN IF NOT EXISTS extracted_id_number TEXT,
  ADD COLUMN IF NOT EXISTS extracted_dob DATE,
  ADD COLUMN IF NOT EXISTS extracted_nationality TEXT,
  ADD COLUMN IF NOT EXISTS face_match_score NUMERIC,
  ADD COLUMN IF NOT EXISTS liveness_score NUMERIC,
  ADD COLUMN IF NOT EXISTS authenticity_score NUMERIC,
  ADD COLUMN IF NOT EXISTS aml_status TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Storage policies for kyc-documents (private). Users upload to their own folder.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='kyc_docs_user_upload') THEN
    CREATE POLICY "kyc_docs_user_upload" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id='kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='kyc_docs_user_read') THEN
    CREATE POLICY "kyc_docs_user_read" ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id='kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='kyc_docs_user_delete') THEN
    CREATE POLICY "kyc_docs_user_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id='kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
