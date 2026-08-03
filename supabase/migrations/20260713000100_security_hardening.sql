-- Security hardening applied after the existing migration history.
-- 1) Remove PostgreSQL's default PUBLIC execute permission from every
--    SECURITY DEFINER function in the public schema. Explicit role grants remain.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.signature);
  END LOOP;
END $$;

-- 2) Conversion and audit rows must be written through trusted RPC/trigger paths,
--    not inserted directly by arbitrary authenticated clients.
REVOKE INSERT ON public.ad_conversions FROM authenticated;
REVOKE INSERT ON public.ad_audit_log FROM authenticated;
DROP POLICY IF EXISTS "Anyone can record conversion" ON public.ad_conversions;
DROP POLICY IF EXISTS "System inserts audit" ON public.ad_audit_log;

-- Preserve the application RPCs that authenticated users legitimately call.
GRANT EXECUTE ON FUNCTION public.record_ad_conversion(uuid,text,numeric,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_ad_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_ad_quality_score(uuid) TO authenticated;

-- 3) Make ad review updates atomic and enforce the admin check inside the database.
CREATE OR REPLACE FUNCTION public.admin_set_ad_review_state(
  p_campaign_id uuid,
  p_state text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_state NOT IN ('approved', 'changes_requested') THEN
    RAISE EXCEPTION 'invalid review state';
  END IF;

  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'note too long';
  END IF;

  UPDATE public.ad_campaigns
  SET review_state = p_state,
      rejection_reason = CASE WHEN p_state = 'changes_requested' THEN p_note ELSE NULL END
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign not found';
  END IF;

  INSERT INTO public.ad_audit_log(campaign_id, actor_id, action, diff)
  VALUES (
    p_campaign_id,
    auth.uid(),
    'review_' || p_state,
    jsonb_build_object('note', p_note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_ad_review_state(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_ad_review_state(uuid,text,text) TO authenticated;
