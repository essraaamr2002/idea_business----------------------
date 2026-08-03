
-- 1) Add minimum share lot to projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS min_share_lot integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.projects.min_share_lot IS 'الحد الأدنى لعدد الأسهم في صفقة بيع واحدة (السوق الموازي + المزايدات والمناقصات)';

-- 2) Share-lot bids: bid (higher price, fewer shares) and tender (lower price, full lot)
CREATE TABLE IF NOT EXISTS public.share_lot_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bid','tender')),
  shares integer NOT NULL CHECK (shares > 0),
  price_per_share numeric(18,4) NOT NULL CHECK (price_per_share > 0),
  total_amount numeric(20,4) GENERATED ALWAYS AS (shares * price_per_share) STORED,
  deposit_amount numeric(20,4) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn','expired')),
  reply text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_lot_bids_project_idx ON public.share_lot_bids(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS share_lot_bids_bidder_idx ON public.share_lot_bids(bidder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS share_lot_bids_owner_idx ON public.share_lot_bids(owner_id, status);

GRANT SELECT, INSERT, UPDATE ON public.share_lot_bids TO authenticated;
GRANT ALL ON public.share_lot_bids TO service_role;

ALTER TABLE public.share_lot_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bidder or owner can read"
  ON public.share_lot_bids FOR SELECT TO authenticated
  USING (bidder_id = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "bidder can insert own"
  ON public.share_lot_bids FOR INSERT TO authenticated
  WITH CHECK (bidder_id = auth.uid());

CREATE POLICY "owner accepts/rejects, bidder withdraws"
  ON public.share_lot_bids FOR UPDATE TO authenticated
  USING (bidder_id = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (bidder_id = auth.uid() OR owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_share_lot_bid_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_share_lot_bids_updated_at ON public.share_lot_bids;
CREATE TRIGGER trg_share_lot_bids_updated_at
  BEFORE UPDATE ON public.share_lot_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_share_lot_bid_updated_at();
