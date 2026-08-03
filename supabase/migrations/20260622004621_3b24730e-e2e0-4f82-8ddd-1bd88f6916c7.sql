
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS show_whatsapp boolean NOT NULL DEFAULT false;

GRANT SELECT (show_whatsapp) ON public.profiles TO anon, authenticated;
GRANT SELECT (show_whatsapp) ON public.projects TO anon, authenticated;
GRANT UPDATE (show_whatsapp, whatsapp) ON public.profiles TO authenticated;
GRANT UPDATE (show_whatsapp, whatsapp) ON public.projects TO authenticated;
GRANT INSERT (show_whatsapp, whatsapp) ON public.projects TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profile_whatsapp(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT whatsapp FROM public.profiles
  WHERE id = _user_id AND show_whatsapp = true AND whatsapp IS NOT NULL AND length(trim(whatsapp)) > 0
$$;

CREATE OR REPLACE FUNCTION public.get_project_whatsapp(_project_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT whatsapp FROM public.projects
  WHERE id = _project_id
    AND show_whatsapp = true
    AND whatsapp IS NOT NULL
    AND length(trim(whatsapp)) > 0
    AND status IN ('active','halted','closed')
$$;

REVOKE ALL ON FUNCTION public.get_profile_whatsapp(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_project_whatsapp(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_whatsapp(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_whatsapp(uuid) TO anon, authenticated;
