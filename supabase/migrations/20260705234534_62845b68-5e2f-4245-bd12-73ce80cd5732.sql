
-- Security-definer helper to check if a user is listed in a digital_contracts.parties jsonb
CREATE OR REPLACE FUNCTION public.is_contract_party(_parties jsonb, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _parties IS NULL OR _user_id IS NULL THEN false
    -- Array of uuid strings: ["uuid1","uuid2"]
    WHEN _parties @> to_jsonb(_user_id::text) THEN true
    -- Array of objects with user_id key: [{"user_id":"uuid"}]
    WHEN _parties @> jsonb_build_array(jsonb_build_object('user_id', _user_id::text)) THEN true
    -- Array of objects with id key
    WHEN _parties @> jsonb_build_array(jsonb_build_object('id', _user_id::text)) THEN true
    -- Object form: {"buyer":"uuid","seller":"uuid"} — exact value match on any key
    WHEN jsonb_typeof(_parties) = 'object' AND EXISTS (
      SELECT 1 FROM jsonb_each_text(_parties) e WHERE e.value = _user_id::text
    ) THEN true
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.is_contract_party(jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_contract_party(jsonb, uuid) TO authenticated, service_role;

-- Replace vulnerable LIKE-based policy with safe JSONB containment check
DROP POLICY IF EXISTS dc_parties_read ON public.digital_contracts;

CREATE POLICY dc_parties_read
ON public.digital_contracts
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_contract_party(parties, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
