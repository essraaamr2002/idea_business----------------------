
-- Tighten secondary_market_listings: forbid sellers from forging completed sales.
-- INSERT: enforce status='open', buyer_id IS NULL, sold_at IS NULL via WITH CHECK.
-- UPDATE: enforce same column lock via WITH CHECK on the new row.

DROP POLICY IF EXISTS sml_seller_write ON public.secondary_market_listings;
DROP POLICY IF EXISTS sml_seller_update ON public.secondary_market_listings;
DROP POLICY IF EXISTS sml_seller_protect_columns ON public.secondary_market_listings;

CREATE POLICY sml_seller_write
ON public.secondary_market_listings
FOR INSERT
TO authenticated
WITH CHECK (
  seller_id = auth.uid()
  AND status = 'open'
  AND buyer_id IS NULL
  AND sold_at IS NULL
);

CREATE POLICY sml_seller_update
ON public.secondary_market_listings
FOR UPDATE
TO authenticated
USING (seller_id = auth.uid())
WITH CHECK (
  seller_id = auth.uid()
  AND status IN ('open','cancelled')
  AND buyer_id IS NULL
  AND sold_at IS NULL
);
