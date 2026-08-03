
-- rate_limit_events: revoke client access; only SECURITY DEFINER (check_rate_limit) writes.
REVOKE ALL ON public.rate_limit_events FROM anon, authenticated;
GRANT ALL ON public.rate_limit_events TO service_role;

-- Be explicit: deny direct client writes via policy.
DROP POLICY IF EXISTS rate_limit_events_deny_all ON public.rate_limit_events;
CREATE POLICY rate_limit_events_deny_all
  ON public.rate_limit_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- share_orders: scope existing policies to authenticated only (defense-in-depth)
DROP POLICY IF EXISTS orders_self_insert ON public.share_orders;
DROP POLICY IF EXISTS orders_self_update ON public.share_orders;

CREATE POLICY orders_self_insert
  ON public.share_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY orders_self_update
  ON public.share_orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
