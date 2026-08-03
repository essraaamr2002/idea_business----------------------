
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;
GRANT SELECT (phone, whatsapp) ON public.projects TO service_role;

DROP FUNCTION IF EXISTS public.get_project_contact(uuid);
CREATE FUNCTION public.get_project_contact(p_id uuid)
RETURNS TABLE(phone text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.phone, p.whatsapp FROM public.projects p
  WHERE p.id = p_id AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
$$;
REVOKE ALL ON FUNCTION public.get_project_contact(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_project_contact(uuid) TO authenticated;
