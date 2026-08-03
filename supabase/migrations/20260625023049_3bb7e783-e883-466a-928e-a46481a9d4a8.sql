
DROP VIEW IF EXISTS public.share_order_book_public;

CREATE OR REPLACE FUNCTION public.get_order_book(_project_id uuid)
RETURNS TABLE(
  price numeric,
  quantity numeric,
  filled_quantity numeric,
  side text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT price, quantity, filled_quantity, side, status, created_at
  FROM public.share_orders_v2
  WHERE project_id = _project_id
    AND status IN ('pending','partial')
  ORDER BY price DESC NULLS LAST, created_at ASC
  LIMIT 500
$$;

REVOKE EXECUTE ON FUNCTION public.get_order_book(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_book(uuid) TO anon, authenticated;
