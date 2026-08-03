DROP POLICY IF EXISTS orders_auth_read ON public.share_orders;
CREATE POLICY orders_self_read ON public.share_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
