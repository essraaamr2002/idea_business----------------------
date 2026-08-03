
-- Pin search_path on all new IBAN funcs
ALTER FUNCTION public.iban_letter_to_digits(text) SET search_path = public;
ALTER FUNCTION public.validate_iban_mod97(text) SET search_path = public;
ALTER FUNCTION public.generate_self_iban(text) SET search_path = public;

-- Lock down all privileged funcs (callable only by service_role / server fns)
REVOKE ALL ON FUNCTION public.generate_self_iban(text)        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_self_iban(uuid, text)    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_hash_chain()             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.iban_letter_to_digits(text)     FROM PUBLIC, anon;

-- Safe utilities exposed to signed-in users
GRANT EXECUTE ON FUNCTION public.validate_iban_mod97(text)    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.iban_letter_to_digits(text)  TO authenticated;
