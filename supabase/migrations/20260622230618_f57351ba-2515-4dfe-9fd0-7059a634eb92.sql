
DROP POLICY IF EXISTS share_orders_open_public_read ON public.share_orders;

CREATE POLICY share_orders_project_owner_read
  ON public.share_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = share_orders.project_id
        AND p.owner_id = auth.uid()
    )
  );
