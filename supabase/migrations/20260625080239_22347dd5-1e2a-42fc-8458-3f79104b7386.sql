
-- 1. Tighten bids policy: never expose sealed bids to others post-auction
DROP POLICY IF EXISTS bids_public_read ON public.bids;

CREATE POLICY bids_public_read ON public.bids
FOR SELECT
TO anon, authenticated
USING (
  sealed = false
  OR bidder_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = bids.auction_id AND a.owner_id = auth.uid()
  )
);

-- 2. Allow anonymous page view inserts (analytics), forbid attaching a user_id
DROP POLICY IF EXISTS pv_insert_anon ON public.page_views;
CREATE POLICY pv_insert_anon ON public.page_views
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

GRANT INSERT ON public.page_views TO anon;
