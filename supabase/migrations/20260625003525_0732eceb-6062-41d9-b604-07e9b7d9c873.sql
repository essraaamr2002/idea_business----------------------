DROP POLICY IF EXISTS "system insert aml" ON public.aml_flags;

REVOKE EXECUTE ON FUNCTION public.wallet_set_pin(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_verify_pin(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_create_deposit_request(bigint, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_admin_confirm_deposit(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_p2p_transfer(uuid, bigint, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_freeze_self(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_unfreeze_self(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_aml_scan(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wallet_generate_iban() FROM anon;