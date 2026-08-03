
ALTER TABLE public.kyc_verifications
  ADD COLUMN IF NOT EXISTS pledge_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arbitration_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pledge_signature_url text,
  ADD COLUMN IF NOT EXISTS pledge_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pledge_full_name text,
  ADD COLUMN IF NOT EXISTS pledge_text_version text DEFAULT 'v1-2026-06',
  ADD COLUMN IF NOT EXISTS liveness_challenge jsonb,
  ADD COLUMN IF NOT EXISTS document_meta jsonb,
  ADD COLUMN IF NOT EXISTS document_expiry date,
  ADD COLUMN IF NOT EXISTS document_type text;

-- Add convenience view for admin to surface pledge data already through SELECT *
COMMENT ON COLUMN public.kyc_verifications.pledge_signature_url IS 'Storage path to digital signature image (PNG) in kyc-signatures bucket';
COMMENT ON COLUMN public.kyc_verifications.liveness_challenge IS 'JSON record of liveness challenge questions, answers and timestamps';
COMMENT ON COLUMN public.kyc_verifications.document_meta IS 'OCR-extracted document fields (name, number, dob, expiry)';
