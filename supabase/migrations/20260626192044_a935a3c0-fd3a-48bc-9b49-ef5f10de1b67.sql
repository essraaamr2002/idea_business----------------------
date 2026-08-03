
CREATE OR REPLACE FUNCTION public.get_user_trust_metrics(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
  _kyc record;
  _bank_verified boolean;
  _projects_total int;
  _projects_active int;
  _offers_received int;
  _disputes_open int;
  _disputes_closed int;
  _ratings_avg numeric;
  _ratings_count int;
  _achievements jsonb;
  _top_sectors jsonb;
BEGIN
  SELECT id, created_at, kyc_status, verified_green, verified_blue, verified_gold, verified_diamond,
         response_rate_pct, deals_completed, reputation_score, followers_count, points, membership
    INTO _p FROM public.profiles WHERE id = _user_id;
  IF _p.id IS NULL THEN RETURN NULL; END IF;

  SELECT status, face_match_score, liveness_score, authenticity_score, pledge_accepted, document_type, country_code
    INTO _kyc FROM public.kyc_verifications
    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM public.user_bank_accounts WHERE user_id = _user_id AND is_verified = true) INTO _bank_verified;

  SELECT COUNT(*) INTO _projects_total FROM public.projects WHERE owner_id = _user_id;
  SELECT COUNT(*) INTO _projects_active FROM public.projects WHERE owner_id = _user_id AND status = 'active';
  SELECT COUNT(*) INTO _offers_received FROM public.investment_offers WHERE owner_id = _user_id;
  SELECT COUNT(*) INTO _disputes_open FROM public.disputes d
    JOIN public.projects p ON p.id = d.project_id
    WHERE p.owner_id = _user_id AND d.status IN ('open','in_review','pending');
  SELECT COUNT(*) INTO _disputes_closed FROM public.disputes d
    JOIN public.projects p ON p.id = d.project_id
    WHERE p.owner_id = _user_id AND d.status IN ('resolved','closed','dismissed');

  SELECT COALESCE(ROUND(AVG(stars_overall)::numeric, 2), 0), COUNT(*)
    INTO _ratings_avg, _ratings_count
    FROM public.user_ratings WHERE rated_id = _user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name_ar', a.name_ar, 'icon', a.icon, 'tier', a.tier
    ) ORDER BY ua.unlocked_at DESC), '[]'::jsonb)
    INTO _achievements
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.id = ua.achievement_id
    WHERE ua.user_id = _user_id;

  SELECT COALESCE(jsonb_agg(s ORDER BY s.cnt DESC), '[]'::jsonb)
    INTO _top_sectors
    FROM (
      SELECT sector, COUNT(*) AS cnt
      FROM public.projects WHERE owner_id = _user_id AND sector IS NOT NULL
      GROUP BY sector ORDER BY cnt DESC LIMIT 5
    ) s;

  RETURN jsonb_build_object(
    'kyc_status', _p.kyc_status,
    'kyc_face_match', _kyc.face_match_score,
    'kyc_liveness', _kyc.liveness_score,
    'kyc_authenticity', _kyc.authenticity_score,
    'kyc_pledge', _kyc.pledge_accepted,
    'verified_green', _p.verified_green,
    'verified_blue', _p.verified_blue,
    'verified_gold', _p.verified_gold,
    'verified_diamond', _p.verified_diamond,
    'bank_verified', _bank_verified,
    'membership', _p.membership,
    'reputation_score', _p.reputation_score,
    'points', _p.points,
    'followers_count', _p.followers_count,
    'deals_completed', _p.deals_completed,
    'response_rate_pct', _p.response_rate_pct,
    'projects_total', _projects_total,
    'projects_active', _projects_active,
    'offers_received', _offers_received,
    'disputes_open', _disputes_open,
    'disputes_closed', _disputes_closed,
    'ratings_avg', _ratings_avg,
    'ratings_count', _ratings_count,
    'achievements', _achievements,
    'top_sectors', _top_sectors,
    'days_since_joined', GREATEST(0, EXTRACT(DAY FROM (now() - _p.created_at))::int),
    'is_new_account', (now() - _p.created_at) < interval '30 days'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_trust_metrics(uuid) TO anon, authenticated;
