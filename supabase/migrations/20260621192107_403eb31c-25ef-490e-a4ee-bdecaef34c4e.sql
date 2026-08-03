
-- commission_ledger: deny all client writes
DROP POLICY IF EXISTS "commission_ledger_no_client_insert" ON public.commission_ledger;
DROP POLICY IF EXISTS "commission_ledger_no_client_update" ON public.commission_ledger;
DROP POLICY IF EXISTS "commission_ledger_no_client_delete" ON public.commission_ledger;
CREATE POLICY "commission_ledger_no_client_insert" ON public.commission_ledger AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "commission_ledger_no_client_update" ON public.commission_ledger AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "commission_ledger_no_client_delete" ON public.commission_ledger AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- ledger: deny all client writes
DROP POLICY IF EXISTS "ledger_no_client_insert" ON public.ledger;
DROP POLICY IF EXISTS "ledger_no_client_update" ON public.ledger;
DROP POLICY IF EXISTS "ledger_no_client_delete" ON public.ledger;
CREATE POLICY "ledger_no_client_insert" ON public.ledger AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "ledger_no_client_update" ON public.ledger AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "ledger_no_client_delete" ON public.ledger AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);

-- kyc_verifications: restrict insert content + deny client update/delete
DROP POLICY IF EXISTS "kyc_insert_clean_only" ON public.kyc_verifications;
CREATE POLICY "kyc_insert_clean_only" ON public.kyc_verifications AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
  status = 'pending' AND ai_score IS NULL AND ai_decision IS NULL AND ai_reasoning IS NULL
);
DROP POLICY IF EXISTS "kyc_no_client_update" ON public.kyc_verifications;
DROP POLICY IF EXISTS "kyc_no_client_delete" ON public.kyc_verifications;
CREATE POLICY "kyc_no_client_update" ON public.kyc_verifications AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "kyc_no_client_delete" ON public.kyc_verifications AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
