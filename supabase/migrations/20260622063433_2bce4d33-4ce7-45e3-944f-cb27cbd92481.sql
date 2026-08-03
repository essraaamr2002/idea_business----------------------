REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;

DROP FUNCTION IF EXISTS public.get_project_contact(uuid);

CREATE FUNCTION public.get_project_contact(_project_id uuid)
RETURNS TABLE (whatsapp text, show_whatsapp boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p.show_whatsapp THEN p.whatsapp ELSE NULL END AS whatsapp,
         COALESCE(p.show_whatsapp, false) AS show_whatsapp
  FROM public.projects p
  WHERE p.id = _project_id
    AND p.status IN ('active','halted','closed');
$$;

GRANT EXECUTE ON FUNCTION public.get_project_contact(uuid) TO anon, authenticated;

CREATE OR REPLACE VIEW public.community_posts_public
WITH (security_barrier = true, security_invoker = true) AS
SELECT
  cp.id,
  cp.created_at,
  cp.updated_at,
  cp.content,
  cp.title,
  cp.post_type,
  cp.category,
  cp.media_urls,
  cp.status,
  cp.repost_of,
  cp.linked_project_id,
  cp.display_as_alias,
  cp.likes_count,
  cp.comments_count,
  cp.reposts_count,
  CASE
    WHEN cp.display_as_alias = true AND cp.user_id <> auth.uid() THEN NULL
    ELSE cp.user_id
  END AS user_id
FROM public.community_posts cp;

GRANT SELECT ON public.community_posts_public TO anon, authenticated;

COMMENT ON VIEW public.community_posts_public IS
  'Public-safe view of community_posts. user_id is NULL when display_as_alias=true and the caller is not the author.';