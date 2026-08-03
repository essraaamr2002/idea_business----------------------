CREATE OR REPLACE FUNCTION public.list_featured_projects(_limit int DEFAULT 6)
RETURNS TABLE(
  id uuid, name text, ticker text, sector text, country text,
  current_price numeric, share_price numeric,
  shares_total int, shares_sold int, cover_image_url text,
  owner_id uuid, owner_name text, owner_avatar text, owner_verified boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.ticker, p.sector, p.country,
         p.current_price, p.share_price, p.shares_total, p.shares_sold, p.cover_image_url,
         p.owner_id, pr.display_name, pr.avatar_url, COALESCE(pr.verified_green, false)
  FROM public.projects p
  LEFT JOIN public.profiles pr ON pr.id = p.owner_id
  WHERE p.status = 'active'
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 6), 24))
$$;
GRANT EXECUTE ON FUNCTION public.list_featured_projects(int) TO anon, authenticated;