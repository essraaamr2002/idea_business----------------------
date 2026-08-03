CREATE OR REPLACE FUNCTION public.create_project_from_wizard(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_status public.project_status := CASE WHEN coalesce((_payload->>'publish_in_community')::boolean, true) THEN 'pending_review'::public.project_status ELSE 'draft'::public.project_status END;
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

  IF v_description IS NULL OR char_length(v_description) < 10 OR char_length(v_description) > 5000 THEN
    RAISE EXCEPTION 'invalid_project_description' USING ERRCODE = 'P0001';
  END IF;

  IF v_currency IS NULL OR char_length(v_currency) < 3 OR char_length(v_currency) > 5 THEN
    RAISE EXCEPTION 'invalid_currency' USING ERRCODE = 'P0001';
  END IF;

  IF v_total_cost IS NULL OR v_total_cost <= 0 THEN
    RAISE EXCEPTION 'invalid_total_cost' USING ERRCODE = 'P0001';
  END IF;

  IF v_funding_mode NOT IN ('marketplace', 'single_investor') THEN
    RAISE EXCEPTION 'invalid_funding_mode' USING ERRCODE = 'P0001';
  END IF;

  IF v_target_investment IS NULL OR v_target_investment <= 0 THEN
    RAISE EXCEPTION 'invalid_target_investment' USING ERRCODE = 'P0001';
  END IF;

  IF v_shares_total IS NULL OR v_shares_total < 1000 THEN
    RAISE EXCEPTION 'invalid_shares_total' USING ERRCODE = 'P0001';
  END IF;

  IF g_type NOT IN ('sand_lamr', 'wasl_amanah', 'cheque', 'kambiala') THEN
    RAISE EXCEPTION 'invalid_guarantee_type' USING ERRCODE = 'P0001';
  END IF;

  IF g_amount IS NULL OR g_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_guarantee_amount' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(coalesce(_payload->'media_urls', '[]'::jsonb)) = 'array' THEN
    SELECT coalesce(array_agg(value), ARRAY[]::text[])
      INTO v_media_urls
    FROM jsonb_array_elements_text(coalesce(_payload->'media_urls', '[]'::jsonb)) AS t(value)
    WHERE value ~* '^https?://';
  END IF;

  IF array_length(v_media_urls, 1) > 20 THEN
    RAISE EXCEPTION 'too_many_media_files' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO plan
  FROM public.membership_plans
  WHERE tier = public.resolve_user_tier(uid)
    AND active IS TRUE
  LIMIT 1;

  IF plan IS NULL THEN
    SELECT * INTO plan
    FROM public.membership_plans
    WHERE tier = 'basic'
    LIMIT 1;
  END IF;

  INSERT INTO public.membership_usage(user_id, period)
  VALUES (uid, cur_period)
  ON CONFLICT (user_id, period) DO NOTHING;

  SELECT * INTO usage_row
  FROM public.membership_usage
  WHERE user_id = uid AND period = cur_period
  FOR UPDATE;

  IF plan.projects_cap >= 0 AND coalesce(usage_row.projects_created, 0) >= plan.projects_cap THEN
    RAISE EXCEPTION 'quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  v_share_price := v_target_investment / v_shares_total;
  base_ticker := upper(regexp_replace(coalesce(raw_ticker, v_name, 'IDEA'), '[^[:alnum:]ء-ي]+', '', 'g'));
  IF base_ticker = '' THEN
    base_ticker := 'IDEA';
  END IF;
  base_ticker := left(base_ticker, 6);

  LOOP
    IF attempt = 0 THEN
      candidate_ticker := base_ticker;
    ELSE
      candidate_ticker := left(base_ticker, 6) || '-' || upper(substr(md5(uid::text || clock_timestamp()::text || random()::text || attempt::text), 1, 4));
    END IF;

    BEGIN
      INSERT INTO public.projects(
        owner_id,
        name,
        ticker,
        sector,
        country,
        currency,
        total_cost,
        shares_total,
        share_price,
        current_price,
        owner_contribution_pct,
        description,
        status,
        is_existing,
        funding_mode,
        target_investment,
        media_urls
      ) VALUES (
        uid,
        v_name,
        candidate_ticker,
        v_sector,
        v_country,
        v_currency,
        v_total_cost,
        v_shares_total,
        v_share_price,
        v_share_price,
        0,
        v_description,
        v_status,
        coalesce((_payload->>'is_existing')::boolean, false),
        v_funding_mode,
        v_target_investment,
        v_media_urls
      )
      RETURNING id INTO v_project_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      attempt := attempt + 1;
      IF attempt > 12 THEN
        RAISE EXCEPTION 'ticker_generation_failed' USING ERRCODE = 'P0001';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.project_guarantee_documents(
    project_id,
    owner_id,
    guarantee_type,
    amount_minor,
    currency,
    signed_document_url,
    guarantor_full_name,
    guarantor_id_number,
    notes
  ) VALUES (
    v_project_id,
    uid,
    g_type,
    round(g_amount * 100)::bigint,
    g_currency,
    g_signed_document_url,
    g_full_name,
    g_id_number,
    g_notes
  );

  UPDATE public.membership_usage
  SET projects_created = projects_created + 1,
      updated_at = now()
  WHERE user_id = uid AND period = cur_period;

  RETURN jsonb_build_object(
    'id', v_project_id,
    'status', v_status,
    'ticker', candidate_ticker
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_project_from_wizard(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_project_from_wizard(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_project_from_wizard(jsonb) TO service_role;