CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_existing boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS funding_mode text NOT NULL DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS target_investment numeric,
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.project_guarantee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  guarantee_type text NOT NULL CHECK (guarantee_type IN ('sand_lamr','wasl_amanah','cheque','kambiala')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'SAR',
  signed_document_url text,
  guarantor_full_name text,
  guarantor_id_number text,
  notes text,
  status text NOT NULL DEFAULT 'pending_review',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_guarantee_documents TO authenticated;
GRANT ALL ON public.project_guarantee_documents TO service_role;

ALTER TABLE public.project_guarantee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_guarantee_docs" ON public.project_guarantee_documents;
CREATE POLICY "owner_select_guarantee_docs" ON public.project_guarantee_documents
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "owner_insert_guarantee_docs" ON public.project_guarantee_documents;
CREATE POLICY "owner_insert_guarantee_docs" ON public.project_guarantee_documents
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "owner_update_guarantee_docs" ON public.project_guarantee_documents;
CREATE POLICY "owner_update_guarantee_docs" ON public.project_guarantee_documents
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_pgd_updated_at ON public.project_guarantee_documents;
CREATE TRIGGER trg_pgd_updated_at
  BEFORE UPDATE ON public.project_guarantee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
