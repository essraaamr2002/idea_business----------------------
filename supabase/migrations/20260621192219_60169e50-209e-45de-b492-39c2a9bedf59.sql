
-- membership_usage
DROP POLICY IF EXISTS "membership_usage_no_client_insert" ON public.membership_usage;
DROP POLICY IF EXISTS "membership_usage_no_client_update" ON public.membership_usage;
DROP POLICY IF EXISTS "membership_usage_no_client_delete" ON public.membership_usage;
CREATE POLICY "membership_usage_no_client_insert" ON public.membership_usage AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "membership_usage_no_client_update" ON public.membership_usage AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "membership_usage_no_client_delete" ON public.membership_usage AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- price_history
DROP POLICY IF EXISTS "price_history_no_client_insert" ON public.price_history;
DROP POLICY IF EXISTS "price_history_no_client_update" ON public.price_history;
DROP POLICY IF EXISTS "price_history_no_client_delete" ON public.price_history;
CREATE POLICY "price_history_no_client_insert" ON public.price_history AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "price_history_no_client_update" ON public.price_history AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "price_history_no_client_delete" ON public.price_history AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- project_shares
DROP POLICY IF EXISTS "project_shares_no_client_insert" ON public.project_shares;
DROP POLICY IF EXISTS "project_shares_no_client_update" ON public.project_shares;
DROP POLICY IF EXISTS "project_shares_no_client_delete" ON public.project_shares;
CREATE POLICY "project_shares_no_client_insert" ON public.project_shares AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "project_shares_no_client_update" ON public.project_shares AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "project_shares_no_client_delete" ON public.project_shares AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- transactions
DROP POLICY IF EXISTS "transactions_no_client_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_no_client_update" ON public.transactions;
DROP POLICY IF EXISTS "transactions_no_client_delete" ON public.transactions;
CREATE POLICY "transactions_no_client_insert" ON public.transactions AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "transactions_no_client_update" ON public.transactions AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "transactions_no_client_delete" ON public.transactions AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- payout_requests: deny direct client writes (request_payout RPC creates them)
DROP POLICY IF EXISTS "payout_requests_no_client_insert" ON public.payout_requests;
DROP POLICY IF EXISTS "payout_requests_no_client_update" ON public.payout_requests;
DROP POLICY IF EXISTS "payout_requests_no_client_delete" ON public.payout_requests;
CREATE POLICY "payout_requests_no_client_insert" ON public.payout_requests AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "payout_requests_no_client_update" ON public.payout_requests AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "payout_requests_no_client_delete" ON public.payout_requests AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- wallets: allow self-insert with zero balance, deny client update/delete
DROP POLICY IF EXISTS "wallets_self_insert_zero" ON public.wallets;
CREATE POLICY "wallets_self_insert_zero" ON public.wallets
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND COALESCE(balance, 0) = 0
    AND COALESCE(held, 0) = 0
  );

DROP POLICY IF EXISTS "wallets_no_client_update" ON public.wallets;
DROP POLICY IF EXISTS "wallets_no_client_delete" ON public.wallets;
CREATE POLICY "wallets_no_client_update" ON public.wallets AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "wallets_no_client_delete" ON public.wallets AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
