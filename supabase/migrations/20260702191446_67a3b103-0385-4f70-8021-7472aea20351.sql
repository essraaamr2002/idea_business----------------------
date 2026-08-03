
CREATE OR REPLACE FUNCTION public.referral_leaderboard(
  period text DEFAULT 'week',
  country_filter text DEFAULT NULL,
  program_filter text DEFAULT NULL,
  row_limit int DEFAULT 50
)
RETURNS TABLE (
  rank bigint,
  referrer_id uuid,
  username text,
  display_name text,
  avatar_url text,
  country text,
  membership text,
  verified_gold boolean,
  verified_diamond boolean,
  referrals_count bigint,
  reward_total numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT CASE
      WHEN period = 'week'  THEN now() - interval '7 days'
      WHEN period = 'month' THEN now() - interval '30 days'
      ELSE '-infinity'::timestamptz
    END AS since
  ),
  agg AS (
    SELECT
      v.referrer_id,
      COUNT(*) FILTER (WHERE v.status IN ('verified','rewarded'))::bigint AS referrals_count,
      (COUNT(*) FILTER (WHERE v.status IN ('verified','rewarded')) * 50)::numeric AS reward_total
    FROM public.referral_verifications v, bounds b
    WHERE v.created_at >= b.since
    GROUP BY v.referrer_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.referrals_count DESC, a.reward_total DESC) AS rank,
    a.referrer_id,
    p.username,
    COALESCE(p.display_name, p.alias_name, p.username) AS display_name,
    p.avatar_url,
    p.country,
    p.membership::text AS membership,
    p.verified_gold,
    p.verified_diamond,
    a.referrals_count,
    a.reward_total
  FROM agg a
  JOIN public.profiles p ON p.id = a.referrer_id
  WHERE a.referrals_count > 0
    AND (country_filter IS NULL OR country_filter = '' OR country_filter = 'all' OR p.country = country_filter)
    AND (program_filter IS NULL OR program_filter = '' OR program_filter = 'all' OR p.membership::text = program_filter)
  ORDER BY a.referrals_count DESC, a.reward_total DESC
  LIMIT GREATEST(1, LEAST(row_limit, 200));
$$;

REVOKE ALL ON FUNCTION public.referral_leaderboard(text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_leaderboard(text, text, text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.referral_leaderboard_countries()
RETURNS TABLE (country text, cnt bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.country, COUNT(DISTINCT v.referrer_id)::bigint AS cnt
  FROM public.referral_verifications v
  JOIN public.profiles p ON p.id = v.referrer_id
  WHERE v.status IN ('verified','rewarded') AND p.country IS NOT NULL AND p.country <> ''
  GROUP BY p.country
  ORDER BY cnt DESC
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.referral_leaderboard_countries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_leaderboard_countries() TO anon, authenticated;
