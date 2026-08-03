-- Remove dangerous public read policies on trading tables
DROP POLICY IF EXISTS ps_public_read ON public.project_shares;
DROP POLICY IF EXISTS st_public_read ON public.share_trades;

-- Restrict share_trades to authenticated users only (buyer/seller can see their own; admins via separate policy if needed)
CREATE POLICY st_parties_read ON public.share_trades
  FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
