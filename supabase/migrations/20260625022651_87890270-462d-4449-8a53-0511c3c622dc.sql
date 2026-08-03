
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','moderator','seo','accountant','support','kyc_admin','compliance_officer','lawyer')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- FIX 1: KYC storage
DROP POLICY IF EXISTS "kyc_docs_user_delete" ON storage.objects;

-- FIX 2 & 3: share_orders_v2 — drop the leaky policy; owner-only direct access
DROP POLICY IF EXISTS "so2_book_read" ON public.share_orders_v2;

-- Public order book view (no user_id)
DROP VIEW IF EXISTS public.share_order_book_public;
CREATE VIEW public.share_order_book_public AS
SELECT
  project_id,
  price,
  quantity,
  filled_quantity,
  side,
  status,
  created_at
FROM public.share_orders_v2
WHERE status IN ('pending','partial');

ALTER VIEW public.share_order_book_public SET (security_invoker = false);
GRANT SELECT ON public.share_order_book_public TO anon, authenticated;
