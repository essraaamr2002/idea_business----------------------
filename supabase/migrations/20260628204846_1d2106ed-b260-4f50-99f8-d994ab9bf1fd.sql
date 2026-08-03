
CREATE TABLE public.ownership_certificate_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_no text NOT NULL UNIQUE,
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  signature_data_url text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ownership_sig_user ON public.ownership_certificate_signatures(user_id);
CREATE INDEX idx_ownership_sig_project ON public.ownership_certificate_signatures(project_id);

GRANT SELECT, INSERT ON public.ownership_certificate_signatures TO authenticated;
GRANT ALL ON public.ownership_certificate_signatures TO service_role;

ALTER TABLE public.ownership_certificate_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signatures"
  ON public.ownership_certificate_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signatures"
  ON public.ownership_certificate_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);
