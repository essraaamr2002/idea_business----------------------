
REVOKE ALL ON FUNCTION public.wallet_deposit(uuid, bigint, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(uuid, bigint, text) TO service_role;

REVOKE ALL ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.assign_self_iban(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_self_iban(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.generate_self_iban(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_self_iban(text) TO service_role;
