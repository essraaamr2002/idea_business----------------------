
DROP POLICY IF EXISTS orders_create ON public.product_orders;

CREATE POLICY orders_create_own
ON public.product_orders
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_create_admin
ON public.product_orders
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
