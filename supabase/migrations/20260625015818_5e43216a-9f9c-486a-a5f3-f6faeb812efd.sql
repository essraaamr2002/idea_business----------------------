-- Block direct client UPDATEs on sensitive financial state tables; all transitions must go through SECURITY DEFINER server functions / RPCs.
CREATE POLICY offers_no_client_update ON public.investment_offers
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY ppr_no_client_update ON public.project_purchase_requests
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);