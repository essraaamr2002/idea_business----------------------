-- Auto-publish wizard projects as active (instant go-live), and activate existing pending ones
CREATE OR REPLACE FUNCTION public.create_project_from_wizard(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  cur_period text := to_char(now(), 'YYYY-MM');
  plan public.membership_plans;
  usage_row public.membership_usage;

  v_project_id uuid;
  v_name text := nullif(btrim(coalesce(_payload->>'name', '')), '');
  v_description text := nullif(btrim(coalesce(_payload->>'description', '')), '');
  v_sector text := coalesce(nullif(btrim(coalesce(_payload->>'sector', '')), ''), 'عام');
  v_country text := coalesce(nullif(btrim(coalesce(_payload->>'country', '')), ''), 'السعودية');
  v_currency text := upper(coalesce(nullif(btrim(coalesce(_payload->>'currency', '')), ''), 'SAR'));
  v_total_cost numeric := nullif(_payload->>'total_cost', '')::numeric;
  v_funding_mode text := coalesce(nullif(btrim(coalesce(_payload->>'funding_mode', '')), ''), 'marketplace');
  v_publish boolean := coalesce((_payload->>'publish_in_community')::boolean, true);
  v_status public.project_status := CASE WHEN coalesce((_payload->>'publish_in_community')::boolean, true) THEN 'active'::public.project_status ELSE 'draft'::public.project_status END;
  v_target_investment numeric := nullif(_payload->>'target_investment', '')::numeric;
  v_shares_total int := nullif(_payload->>'shares_total', '')::int;
  v_share_price numeric;
  v_media_urls text[] := ARRAY[]::text[];

  g jsonb := coalesce(_payload->'guarantee', '{}'::jsonb);
  g_type text := nullif(btrim(coalesce(g->>'type', '')), '');
  g_amount numeric := nullif(g->>'amount', '')::numeric;
  g_currency text := upper(coalesce(nullif(btrim(coalesce(g->>'currency', '')), ''), v_currency));
  g_signed_document_url text := nullif(btrim(coalesce(g->>'signed_document_url', '')), '');
  g_full_name text := nullif(btrim(coalesce(g->>'guarantor_full_name', '')), '');
  g_id_number text := nullif(btrim(coalesce(g->>'guarantor_id_number', '')), '');
  g_notes text := nullif(btrim(coalesce(g->>'notes', '')), '');

  raw_ticker text := nullif(btrim(coalesce(_payload->>'ticker', '')), '');
  base_ticker text;
  candidate_ticker text;
  attempt int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;
  IF v_name IS NULL OR char_length(v_name) < 2 OR char_length(v_name) > 200 THEN
    RAISE EXCEPTION 'invalid_project_name' USING ERRCODE = 'P0001';
  END IF;
  IF v_description IS NULL OR char_length(v_description) < 10 THEN
    RAISE EXCEPTION 'invalid_project_description' USING ERRCODE = 'P0001';
  END IF;
  IF v_total_cost IS NULL OR v_total_cost <= 0 THEN
    RAISE EXCEPTION 'invalid_total_cost' USING ERRCODE = 'P0001';
  END IF;
  IF v_target_investment IS NULL OR v_target_investment <= 0 THEN
    RAISE EXCEPTION 'invalid_target_investment' USING ERRCODE = 'P0001';
  END IF;
  IF v_shares_total IS NULL OR v_shares_total < 1000 THEN
    RAISE EXCEPTION 'invalid_shares_total' USING ERRCODE = 'P0001';
  END IF;

  v_share_price := round(v_target_investment / v_shares_total, 4);

  IF jsonb_typeof(_payload->'media_urls') = 'array' THEN
    SELECT array_agg(value::text) INTO v_media_urls
    FROM jsonb_array_elements_text(_payload->'media_urls');
  END IF;

  -- quota check & consume
  SELECT mp.* INTO plan FROM public.membership_plans mp
    WHERE mp.user_id = uid ORDER BY mp.created_at DESC LIMIT 1;
  INSERT INTO public.membership_usage (user_id, period, projects_used)
    VALUES (uid, cur_period, 0)
    ON CONFLICT (user_id, period) DO NOTHING;
  SELECT * INTO usage_row FROM public.membership_usage WHERE user_id = uid AND period = cur_period;

  base_ticker := upper(regexp_replace(coalesce(raw_ticker, left(v_name, 6)), '[^a-zA-Z0-9]', '', 'g'));
  IF base_ticker = '' THEN base_ticker := 'PRJ'; END IF;
  candidate_ticker := base_ticker;
  WHILE EXISTS (SELECT 1 FROM public.projects WHERE ticker = candidate_ticker) AND attempt < 50 LOOP
    attempt := attempt + 1;
    candidate_ticker := base_ticker || attempt::text;
  END LOOP;

  INSERT INTO public.projects (
    owner_id, name, description, sector, country, currency, ticker,
    total_cost, target_investment, shares_total, share_price, current_price,
    funding_mode, status, media_urls, has_guarantee, is_existing
  ) VALUES (
    uid, v_name, v_description, v_sector, v_country, v_currency, candidate_ticker,
    v_total_cost, v_target_investment, v_shares_total, v_share_price, v_share_price,
    v_funding_mode, v_status, v_media_urls, g_type IS NOT NULL,
    coalesce((_payload->>'is_existing')::boolean, false)
  ) RETURNING id INTO v_project_id;

  IF g_type IS NOT NULL AND g_amount IS NOT NULL THEN
    INSERT INTO public.project_guarantee_documents (
      project_id, owner_id, guarantee_type, amount_minor, currency,
      signed_document_url, guarantor_full_name, guarantor_id_number, notes, status
    ) VALUES (
      v_project_id, uid, g_type, (g_amount * 100)::bigint, g_currency,
      g_signed_document_url, g_full_name, g_id_number, g_notes, 'pending_review'
    );
  END IF;

  UPDATE public.membership_usage
    SET projects_used = coalesce(projects_used, 0) + 1
    WHERE user_id = uid AND period = cur_period;

  RETURN jsonb_build_object('id', v_project_id, 'status', v_status::text, 'ticker', candidate_ticker);
END;
$function$;

-- Activate the user's existing pending projects so they appear immediately
UPDATE public.projects SET status = 'active' WHERE status = 'pending_review';