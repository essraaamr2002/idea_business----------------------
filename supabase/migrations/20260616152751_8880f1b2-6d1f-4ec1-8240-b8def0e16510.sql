
-- Pure math functions don't need elevated privs
ALTER FUNCTION public.iban_letter_to_digits(text) SECURITY INVOKER;
ALTER FUNCTION public.validate_iban_mod97(text)   SECURITY INVOKER;

-- Restrict verify_ledger_integrity: only self or admin
CREATE OR REPLACE FUNCTION public.verify_ledger_integrity(p_user_id uuid)
RETURNS TABLE(secure boolean, tampered_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r RECORD;
  expected text := repeat('0', 64);
  calc text;
  payload text;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR r IN
    SELECT id, user_id, amount, type, reference, balance_before, balance_after, prev_hash, current_hash
    FROM public.ledger WHERE user_id = p_user_id
    ORDER BY created_at ASC, id ASC
  LOOP
    payload := COALESCE(r.user_id::text,'') || '|' ||
               COALESCE(r.amount::text,'')  || '|' ||
               COALESCE(r.type,'')          || '|' ||
               COALESCE(r.reference,'')     || '|' ||
               COALESCE(r.balance_before::text,'') || '|' ||
               COALESCE(r.balance_after::text,'')  || '|' ||
               COALESCE(r.prev_hash,'');
    calc := encode(digest(payload, 'sha256'), 'hex');
    IF r.prev_hash IS DISTINCT FROM expected OR r.current_hash IS DISTINCT FROM calc THEN
      RETURN QUERY SELECT false, r.id; RETURN;
    END IF;
    expected := r.current_hash;
  END LOOP;
  RETURN QUERY SELECT true, NULL::uuid;
END $$;

GRANT EXECUTE ON FUNCTION public.verify_ledger_integrity(uuid) TO authenticated;
