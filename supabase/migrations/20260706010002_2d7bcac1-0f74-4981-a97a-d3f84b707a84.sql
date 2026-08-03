DROP POLICY IF EXISTS sm_pe_public ON public.sm_price_events;
CREATE POLICY sm_pe_authenticated_read ON public.sm_price_events
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.sm_price_events FROM anon;
GRANT SELECT ON public.sm_price_events TO authenticated;