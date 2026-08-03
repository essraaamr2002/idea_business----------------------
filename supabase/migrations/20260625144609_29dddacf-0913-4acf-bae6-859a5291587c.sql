-- 1) PROJECT BADGES & BOOST
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS quality_badges text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS boost_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_projects_boost ON public.projects (boost_score DESC, boost_expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_badges ON public.projects USING gin (quality_badges);

-- 2) ESCROW
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'holding' CHECK (status IN ('holding','released','refunded','disputed','cancelled')),
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  release_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  released_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.escrow_accounts TO authenticated;
GRANT ALL ON public.escrow_accounts TO service_role;
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY escrow_parties_read ON public.escrow_accounts FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY escrow_buyer_insert ON public.escrow_accounts FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY escrow_admin_update ON public.escrow_accounts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_escrow_project ON public.escrow_accounts(project_id);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON public.escrow_accounts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON public.escrow_accounts(seller_id);

-- 3) DIGITAL CONTRACTS
CREATE TABLE IF NOT EXISTS public.digital_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_type text NOT NULL CHECK (contract_type IN ('investment','purchase','escrow','sand_lamr','wasl_amanah','custom')),
  parties jsonb NOT NULL,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  pdf_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','signed_party_a','signed_party_b','fully_signed','cancelled')),
  signed_by_a_at timestamptz,
  signed_by_b_at timestamptz,
  signature_a_url text,
  signature_b_url text,
  amount numeric,
  currency text DEFAULT 'USD',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.digital_contracts TO authenticated;
GRANT ALL ON public.digital_contracts TO service_role;
ALTER TABLE public.digital_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY dc_parties_read ON public.digital_contracts FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (parties::text ILIKE '%' || auth.uid()::text || '%') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY dc_creator_insert ON public.digital_contracts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY dc_parties_update ON public.digital_contracts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4) BUYER PROTECTION
CREATE TABLE IF NOT EXISTS public.buyer_protection_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  reason text NOT NULL,
  evidence_urls text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected','refunded')),
  protection_window_days integer NOT NULL DEFAULT 14,
  filed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  refund_amount numeric,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.buyer_protection_claims TO authenticated;
GRANT ALL ON public.buyer_protection_claims TO service_role;
ALTER TABLE public.buyer_protection_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY bpc_parties_read ON public.buyer_protection_claims FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY bpc_buyer_insert ON public.buyer_protection_claims FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());
CREATE POLICY bpc_admin_update ON public.buyer_protection_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5) AI ANALYSIS CACHE
CREATE TABLE IF NOT EXISTS public.project_ai_analysis (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  roi_estimate numeric,
  risk_score numeric CHECK (risk_score BETWEEN 0 AND 100),
  market_fit_score numeric CHECK (market_fit_score BETWEEN 0 AND 100),
  ai_summary text,
  strengths text[],
  weaknesses text[],
  opportunities text[],
  threats text[],
  competitors jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  model_version text DEFAULT 'gemini-2.5-flash'
);
GRANT SELECT ON public.project_ai_analysis TO authenticated, anon;
GRANT ALL ON public.project_ai_analysis TO service_role;
ALTER TABLE public.project_ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY pai_public_read ON public.project_ai_analysis FOR SELECT TO authenticated, anon USING (true);

-- 6) COMPARISON LISTS
CREATE TABLE IF NOT EXISTS public.project_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_comparisons TO authenticated;
GRANT ALL ON public.project_comparisons TO service_role;
ALTER TABLE public.project_comparisons ENABLE ROW LEVEL SECURITY;
CREATE POLICY pc_owner_all ON public.project_comparisons FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7) ANTI-SNIPE
CREATE OR REPLACE FUNCTION public.anti_snipe_extend_auction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_end timestamptz;
BEGIN
  SELECT end_time INTO v_end FROM public.auctions WHERE id = NEW.auction_id;
  IF v_end IS NOT NULL AND v_end - now() < interval '60 seconds' AND v_end > now() THEN
    UPDATE public.auctions SET end_time = end_time + interval '60 seconds', updated_at = now() WHERE id = NEW.auction_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_anti_snipe_bids ON public.bids;
CREATE TRIGGER trg_anti_snipe_bids AFTER INSERT ON public.bids FOR EACH ROW EXECUTE FUNCTION public.anti_snipe_extend_auction();

-- 8) QUALITY BADGE REFRESH
CREATE OR REPLACE FUNCTION public.refresh_project_quality_badges(p_project_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_badges text[] := '{}'; v_views int; v_invs int; v_age interval; v_deadline timestamptz;
BEGIN
  SELECT view_count, COALESCE(conversion_count,0), now() - created_at, deadline
    INTO v_views, v_invs, v_age, v_deadline FROM public.projects WHERE id = p_project_id;
  IF v_views > 500 AND v_age < interval '7 days' THEN v_badges := array_append(v_badges, 'trending'); END IF;
  IF v_invs > 10 AND v_age < interval '30 days' THEN v_badges := array_append(v_badges, 'hot_deal'); END IF;
  IF EXISTS (SELECT 1 FROM public.project_ai_analysis WHERE project_id = p_project_id AND market_fit_score >= 80) THEN
    v_badges := array_append(v_badges, 'ai_recommended');
  END IF;
  IF v_deadline IS NOT NULL AND v_deadline - now() < interval '3 days' AND v_deadline > now() THEN
    v_badges := array_append(v_badges, 'ending_soon');
  END IF;
  UPDATE public.projects SET quality_badges = v_badges, updated_at = now() WHERE id = p_project_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.refresh_project_quality_badges(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.refresh_project_quality_badges(uuid) TO authenticated, service_role;

-- 9) updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS
$$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS set_updated_at_escrow ON public.escrow_accounts;
CREATE TRIGGER set_updated_at_escrow BEFORE UPDATE ON public.escrow_accounts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_dc ON public.digital_contracts;
CREATE TRIGGER set_updated_at_dc BEFORE UPDATE ON public.digital_contracts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_bpc ON public.buyer_protection_claims;
CREATE TRIGGER set_updated_at_bpc BEFORE UPDATE ON public.buyer_protection_claims FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_pc ON public.project_comparisons;
CREATE TRIGGER set_updated_at_pc BEFORE UPDATE ON public.project_comparisons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- 10) REALTIME
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.escrow_accounts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.digital_contracts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_protection_claims;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;