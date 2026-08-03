
-- ============================================================
-- SECURITY FIX: Remove anonymous read on user_achievements
-- ============================================================
DROP POLICY IF EXISTS ua_public_read ON public.user_achievements;

-- ============================================================
-- AUCTIONS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.auction_type AS ENUM ('english','sealed','dutch','reserve','buynow');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.auction_status AS ENUM ('scheduled','live','ended','cancelled','awarded','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bid_status AS ENUM ('active','outbid','winning','won','lost','refunded','forfeited');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  type public.auction_type NOT NULL DEFAULT 'english',
  currency text NOT NULL DEFAULT 'SAR',
  start_price numeric(18,2) NOT NULL,
  reserve_price numeric(18,2),
  buy_now_price numeric(18,2),
  min_increment numeric(18,2) NOT NULL DEFAULT 1000,
  deposit_required_pct numeric(5,2) NOT NULL DEFAULT 5.00,
  current_price numeric(18,2) NOT NULL,
  current_winner_id uuid,
  bids_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  auto_extend_minutes integer NOT NULL DEFAULT 5,
  status public.auction_status NOT NULL DEFAULT 'scheduled',
  winner_id uuid,
  final_price numeric(18,2),
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auctions_project ON public.auctions(project_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends ON public.auctions(status, ends_at);

GRANT SELECT ON public.auctions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY auctions_public_read ON public.auctions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY auctions_owner_insert ON public.auctions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY auctions_owner_update ON public.auctions FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER trg_auctions_updated BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- BIDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  is_auto_bid boolean NOT NULL DEFAULT false,
  max_auto_amount numeric(18,2),
  deposit_held numeric(18,2) NOT NULL DEFAULT 0,
  status public.bid_status NOT NULL DEFAULT 'active',
  sealed boolean NOT NULL DEFAULT false,
  outbid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON public.bids(auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids(bidder_id);

GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT SELECT ON public.bids TO anon;
GRANT ALL ON public.bids TO service_role;

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Public read EXCEPT sealed bids (sealed only visible to bidder + auction owner)
CREATE POLICY bids_public_read ON public.bids FOR SELECT TO anon, authenticated USING (
  sealed = false
  OR bidder_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.id = auction_id AND (a.owner_id = auth.uid() OR a.status IN ('ended','awarded','expired')))
);
CREATE POLICY bids_self_insert ON public.bids FOR INSERT TO authenticated WITH CHECK (bidder_id = auth.uid());

-- ============================================================
-- NEGOTIATIONS (counter offers)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.negotiation_status AS ENUM ('open','accepted','rejected','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  round_number integer NOT NULL DEFAULT 1,
  current_offer_amount numeric(18,2) NOT NULL,
  current_offer_by uuid NOT NULL,
  proposed_equity_pct numeric(5,2),
  terms_text text,
  status public.negotiation_status NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_neg_project ON public.negotiations(project_id);
CREATE INDEX IF NOT EXISTS idx_neg_parties ON public.negotiations(investor_id, owner_id);

GRANT SELECT, INSERT, UPDATE ON public.negotiations TO authenticated;
GRANT ALL ON public.negotiations TO service_role;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY neg_parties_read ON public.negotiations FOR SELECT TO authenticated
  USING (investor_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY neg_investor_insert ON public.negotiations FOR INSERT TO authenticated
  WITH CHECK (investor_id = auth.uid());
CREATE POLICY neg_parties_update ON public.negotiations FOR UPDATE TO authenticated
  USING (investor_id = auth.uid() OR owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.offer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  made_by_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  equity_pct numeric(5,2),
  terms_text text,
  response text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_neg ON public.offer_history(negotiation_id);

GRANT SELECT, INSERT ON public.offer_history TO authenticated;
GRANT ALL ON public.offer_history TO service_role;
ALTER TABLE public.offer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY oh_parties_read ON public.offer_history FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.negotiations n WHERE n.id = negotiation_id AND (n.investor_id = auth.uid() OR n.owner_id = auth.uid()))
);
CREATE POLICY oh_parties_insert ON public.offer_history FOR INSERT TO authenticated WITH CHECK (
  made_by_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.negotiations n WHERE n.id = negotiation_id AND (n.investor_id = auth.uid() OR n.owner_id = auth.uid()))
);

-- ============================================================
-- REPUTATION SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  points_change integer NOT NULL,
  balance_after integer NOT NULL,
  reference_id uuid,
  reference_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rep_user ON public.reputation_events(user_id, created_at DESC);

GRANT SELECT ON public.reputation_events TO authenticated;
GRANT ALL ON public.reputation_events TO service_role;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY rep_self_read ON public.reputation_events FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Add reputation_score to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deals_completed integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS response_rate_pct integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS investment_volume_visible boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_gold boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_diamond boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.award_reputation(_user_id uuid, _event_type text, _delta integer, _ref_id uuid DEFAULT NULL, _ref_type text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_score integer;
BEGIN
  IF _user_id IS NULL OR _delta = 0 THEN RETURN NULL; END IF;
  UPDATE public.profiles
    SET reputation_score = GREATEST(0, LEAST(1000, reputation_score + _delta))
    WHERE id = _user_id
    RETURNING reputation_score INTO new_score;
  INSERT INTO public.reputation_events(user_id, event_type, points_change, balance_after, reference_id, reference_type)
    VALUES (_user_id, _event_type, _delta, COALESCE(new_score,0), _ref_id, _ref_type);
  RETURN new_score;
END $$;

-- ============================================================
-- USER RATINGS (after-deal, 5 criteria)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id uuid NOT NULL,
  rated_id uuid NOT NULL,
  deal_ref_type text NOT NULL,
  deal_ref_id uuid NOT NULL,
  stars_overall integer NOT NULL CHECK (stars_overall BETWEEN 1 AND 5),
  stars_communication integer NOT NULL CHECK (stars_communication BETWEEN 1 AND 5),
  stars_commitment integer NOT NULL CHECK (stars_commitment BETWEEN 1 AND 5),
  stars_transparency integer NOT NULL CHECK (stars_transparency BETWEEN 1 AND 5),
  stars_speed integer NOT NULL CHECK (stars_speed BETWEEN 1 AND 5),
  stars_professionalism integer NOT NULL CHECK (stars_professionalism BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rater_id, deal_ref_type, deal_ref_id)
);
CREATE INDEX IF NOT EXISTS idx_ur_rated ON public.user_ratings(rated_id);

GRANT SELECT, INSERT ON public.user_ratings TO authenticated;
GRANT SELECT ON public.user_ratings TO anon;
GRANT ALL ON public.user_ratings TO service_role;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ur_public_read ON public.user_ratings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ur_rater_insert ON public.user_ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid() AND rater_id <> rated_id);

-- ============================================================
-- PROJECT EXTENSIONS: Q&A, REVIEWS, UPDATES
-- ============================================================
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS offer_types text[] NOT NULL DEFAULT ARRAY['direct']::text[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS valuation numeric(18,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS equity_offered_pct numeric(5,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS business_plan_pdf_url text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS expected_return_pct numeric(5,2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS contract_duration_months integer;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_use_breakdown jsonb;

CREATE TABLE IF NOT EXISTS public.project_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  asker_id uuid NOT NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  upvotes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pq_project ON public.project_questions(project_id, created_at DESC);
GRANT SELECT ON public.project_questions TO anon, authenticated;
GRANT INSERT, UPDATE ON public.project_questions TO authenticated;
GRANT ALL ON public.project_questions TO service_role;
ALTER TABLE public.project_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pq_public_read ON public.project_questions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pq_asker_insert ON public.project_questions FOR INSERT TO authenticated WITH CHECK (asker_id = auth.uid());
CREATE POLICY pq_owner_answer ON public.project_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.project_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, reviewer_id)
);
CREATE INDEX IF NOT EXISTS idx_pr_project ON public.project_reviews(project_id);
GRANT SELECT ON public.project_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_reviews TO authenticated;
GRANT ALL ON public.project_reviews TO service_role;
ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY prv_public_read ON public.project_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY prv_self_write ON public.project_reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY prv_self_update ON public.project_reviews FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());
CREATE POLICY prv_self_delete ON public.project_reviews FOR DELETE TO authenticated USING (reviewer_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  media_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pu_project ON public.project_updates(project_id, created_at DESC);
GRANT SELECT ON public.project_updates TO anon, authenticated;
GRANT INSERT ON public.project_updates TO authenticated;
GRANT ALL ON public.project_updates TO service_role;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY pu_public_read ON public.project_updates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY pu_owner_insert ON public.project_updates FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- ============================================================
-- SECONDARY MARKET
-- ============================================================
CREATE TABLE IF NOT EXISTS public.secondary_market_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  shares integer NOT NULL CHECK (shares > 0),
  ask_price numeric(18,2) NOT NULL,
  offer_type text NOT NULL DEFAULT 'direct',
  status text NOT NULL DEFAULT 'open',
  buyer_id uuid,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sml_project ON public.secondary_market_listings(project_id, status);
GRANT SELECT ON public.secondary_market_listings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.secondary_market_listings TO authenticated;
GRANT ALL ON public.secondary_market_listings TO service_role;
ALTER TABLE public.secondary_market_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sml_public_read ON public.secondary_market_listings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sml_seller_write ON public.secondary_market_listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY sml_seller_update ON public.secondary_market_listings FOR UPDATE TO authenticated USING (seller_id = auth.uid());

-- ============================================================
-- CO-INVESTMENT GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.co_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL,
  target_amount numeric(18,2) NOT NULL,
  collected_amount numeric(18,2) NOT NULL DEFAULT 0,
  min_contribution numeric(18,2) NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.co_investments TO anon, authenticated;
GRANT INSERT, UPDATE ON public.co_investments TO authenticated;
GRANT ALL ON public.co_investments TO service_role;
ALTER TABLE public.co_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ci_public_read ON public.co_investments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ci_organizer_write ON public.co_investments FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY ci_organizer_update ON public.co_investments FOR UPDATE TO authenticated USING (organizer_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.co_investment_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  co_investment_id uuid NOT NULL REFERENCES public.co_investments(id) ON DELETE CASCADE,
  contributor_id uuid NOT NULL,
  amount numeric(18,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.co_investment_contributions TO authenticated;
GRANT ALL ON public.co_investment_contributions TO service_role;
ALTER TABLE public.co_investment_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cic_member_read ON public.co_investment_contributions FOR SELECT TO authenticated USING (
  contributor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.co_investments ci WHERE ci.id = co_investment_id AND ci.organizer_id = auth.uid())
);
CREATE POLICY cic_self_insert ON public.co_investment_contributions FOR INSERT TO authenticated WITH CHECK (contributor_id = auth.uid());

-- ============================================================
-- ATOMIC BID PLACEMENT (with deposit hold + anti-snipe)
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id uuid,
  p_amount numeric,
  p_is_auto boolean DEFAULT false,
  p_max_auto numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_auction public.auctions;
  v_deposit numeric;
  v_bal numeric;
  v_bid_id uuid;
  v_min_next numeric;
  v_extend boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF v_auction.id IS NULL THEN RAISE EXCEPTION 'auction_not_found'; END IF;
  IF v_auction.owner_id = v_uid THEN RAISE EXCEPTION 'owner_cannot_bid'; END IF;
  IF v_auction.status NOT IN ('live','scheduled') THEN RAISE EXCEPTION 'auction_not_active'; END IF;
  IF now() > v_auction.ends_at THEN RAISE EXCEPTION 'auction_ended'; END IF;
  IF now() >= v_auction.starts_at AND v_auction.status = 'scheduled' THEN
    UPDATE public.auctions SET status = 'live' WHERE id = p_auction_id;
    v_auction.status := 'live';
  END IF;

  -- Validate amount for non-sealed types
  IF v_auction.type IN ('english','reserve','buynow') THEN
    v_min_next := v_auction.current_price + v_auction.min_increment;
    IF p_amount < v_min_next THEN RAISE EXCEPTION 'bid_too_low: minimum %', v_min_next; END IF;
  ELSIF v_auction.type = 'dutch' THEN
    IF p_amount < v_auction.current_price THEN RAISE EXCEPTION 'must_accept_current_price'; END IF;
  END IF;

  -- Deposit
  v_deposit := round(v_auction.start_price * v_auction.deposit_required_pct / 100.0, 2);
  SELECT balance INTO v_bal FROM public.wallets WHERE user_id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_deposit THEN RAISE EXCEPTION 'insufficient_deposit: needs %', v_deposit; END IF;

  -- Mark prior winning bid as outbid
  UPDATE public.bids
    SET status = 'outbid', outbid_at = now()
    WHERE auction_id = p_auction_id AND status IN ('active','winning');

  INSERT INTO public.bids(auction_id, bidder_id, amount, is_auto_bid, max_auto_amount, deposit_held, status, sealed)
    VALUES (p_auction_id, v_uid, p_amount, p_is_auto, p_max_auto, v_deposit, 'winning', v_auction.type = 'sealed')
    RETURNING id INTO v_bid_id;

  -- Anti-snipe extension
  IF v_auction.type IN ('english','reserve','buynow') THEN
    IF (v_auction.ends_at - now()) < (v_auction.auto_extend_minutes || ' minutes')::interval THEN
      v_extend := true;
      UPDATE public.auctions
        SET current_price = p_amount,
            current_winner_id = v_uid,
            bids_count = bids_count + 1,
            ends_at = ends_at + (v_auction.auto_extend_minutes || ' minutes')::interval
        WHERE id = p_auction_id;
    ELSE
      UPDATE public.auctions
        SET current_price = p_amount,
            current_winner_id = v_uid,
            bids_count = bids_count + 1
        WHERE id = p_auction_id;
    END IF;
  ELSE
    UPDATE public.auctions
      SET bids_count = bids_count + 1
      WHERE id = p_auction_id;
  END IF;

  -- Buy-Now instant win
  IF v_auction.type = 'buynow' AND v_auction.buy_now_price IS NOT NULL AND p_amount >= v_auction.buy_now_price THEN
    UPDATE public.auctions
      SET status = 'awarded', winner_id = v_uid, final_price = p_amount, completed_at = now(), ends_at = now()
      WHERE id = p_auction_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'bid_id', v_bid_id, 'extended', v_extend, 'deposit_held', v_deposit);
END $$;

-- ============================================================
-- CLOSE EXPIRED AUCTIONS (called by cron or admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a record;
  v_count integer := 0;
BEGIN
  FOR v_a IN SELECT * FROM public.auctions WHERE status = 'live' AND ends_at <= now() LOOP
    IF v_a.type = 'reserve' AND v_a.reserve_price IS NOT NULL AND v_a.current_price < v_a.reserve_price THEN
      UPDATE public.auctions SET status = 'expired', completed_at = now() WHERE id = v_a.id;
    ELSIF v_a.current_winner_id IS NOT NULL THEN
      UPDATE public.auctions
        SET status = 'awarded', winner_id = v_a.current_winner_id, final_price = v_a.current_price, completed_at = now()
        WHERE id = v_a.id;
    ELSE
      UPDATE public.auctions SET status = 'ended', completed_at = now() WHERE id = v_a.id;
    END IF;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

-- Enable realtime on auctions and bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
