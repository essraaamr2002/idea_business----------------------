ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_bumped_at timestamptz;

CREATE OR REPLACE FUNCTION public.bump_my_project(p_project_id uuid)
RETURNS TABLE(ok boolean, last_bumped_at timestamptz, next_allowed_at timestamptz, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_last timestamptz;
  v_next timestamptz;
BEGIN
  SELECT owner_id, projects.last_bumped_at INTO v_owner, v_last
  FROM public.projects WHERE id = p_project_id;
  IF v_owner IS NULL THEN
    RETURN QUERY SELECT false, NULL::timestamptz, NULL::timestamptz, 'not_found'::text;
    RETURN;
  END IF;
  IF v_owner <> auth.uid() THEN
    RETURN QUERY SELECT false, v_last, NULL::timestamptz, 'forbidden'::text;
    RETURN;
  END IF;
  IF v_last IS NOT NULL AND v_last > now() - interval '3 days' THEN
    v_next := v_last + interval '3 days';
    RETURN QUERY SELECT false, v_last, v_next, 'cooldown'::text;
    RETURN;
  END IF;
  UPDATE public.projects SET last_bumped_at = now(), updated_at = now() WHERE id = p_project_id;
  RETURN QUERY SELECT true, now(), (now() + interval '3 days'), 'ok'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_my_project(uuid) TO authenticated;