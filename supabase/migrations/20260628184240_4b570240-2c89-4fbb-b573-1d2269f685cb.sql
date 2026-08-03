
-- 1) ad_conversions: block direct client inserts; require server RPC (matches ad_events pattern)
DROP POLICY IF EXISTS "Authenticated users record their conversions" ON public.ad_conversions;
CREATE POLICY ad_conversions_no_client_insert
  ON public.ad_conversions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

-- 2) secondary_market_listings: prevent sellers from forging status / buyer_id / sold_at
--    Keep ownership-based update permission, but add a RESTRICTIVE policy that pins
--    these protected columns to their original values for any non-service-role update.
DROP POLICY IF EXISTS sml_seller_protect_columns ON public.secondary_market_listings;
CREATE POLICY sml_seller_protect_columns
  ON public.secondary_market_listings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    status     IS NOT DISTINCT FROM (SELECT status     FROM public.secondary_market_listings s WHERE s.id = secondary_market_listings.id)
    AND buyer_id IS NOT DISTINCT FROM (SELECT buyer_id FROM public.secondary_market_listings s WHERE s.id = secondary_market_listings.id)
    AND sold_at  IS NOT DISTINCT FROM (SELECT sold_at  FROM public.secondary_market_listings s WHERE s.id = secondary_market_listings.id)
  );
