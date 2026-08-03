
-- ========= Referral System v2 =========

-- 1) Clicks tracking (anon-writable via SECURITY DEFINER RPC only)
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL,
  ip_hash      text,
  ua_hash      text,
  referer      text,
  utm          jsonb,
  converted    boolean NOT NULL DEFAULT false,
  converted_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_clicks_code_idx ON public.referral_clicks(code, clicked_at DESC);
CREATE INDEX IF NOT EXISTS referral_clicks_ip_idx   ON public.referral_clicks(ip_hash, clicked_at DESC);

GRANT SELECT ON public.referral_clicks TO authenticated;
GRANT ALL    ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
-- Only the referrer can see clicks tied to their code
CREATE POLICY referral_clicks_owner_select ON public.referral_clicks
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.referrals r
     WHERE upper(r.code) = upper(referral_clicks.code)
       AND r.referrer_id = auth.uid()
  ));

-- 2) Verified referral pairs (referrer -> referred, with anti-fraud status)
DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending','verified','rewarded','flagged');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.referral_verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code         text NOT NULL,
  status       public.referral_status NOT NULL DEFAULT 'pending',
  fraud_score  numeric(3,2) NOT NULL DEFAULT 0,
  fraud_reason text,
  ip_hash      text,
  ua_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  verified_at  timestamptz,
  rewarded_at  timestamptz
);
CREATE INDEX IF NOT EXISTS referral_verifications_referrer_idx ON public.referral_verifications(referrer_id, status);

GRANT SELECT ON public.referral_verifications TO authenticated;
GRANT ALL    ON public.referral_verifications TO service_role;
ALTER TABLE public.referral_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY refver_referrer_select ON public.referral_verifications
  FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- 3) Idempotency guard for referral reward ledger entries
CREATE UNIQUE INDEX IF NOT EXISTS user_points_log_referral_uniq
  ON public.user_points_log(ref_type, ref_id)
  WHERE ref_type IN ('referral_verified','referral_signup');

-- 4) RPC: log a click (callable by anon; SECURITY DEFINER, rate-limited)
CREATE OR REPLACE FUNCTION public.log_referral_click(
  p_code text, p_ip_hash text, p_ua_hash text, p_referer text DEFAULT NULL, p_utm jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_recent int;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN RETURN; END IF;
  -- soft rate-limit: 20 clicks / IP / minute per code
  SELECT count(*) INTO v_recent FROM public.referral_clicks
    WHERE ip_hash = p_ip_hash AND clicked_at > now() - interval '1 minute';
  IF v_recent > 20 THEN RETURN; END IF;
  INSERT INTO public.referral_clicks(code, ip_hash, ua_hash, referer, utm)
    VALUES (upper(trim(p_code)), p_ip_hash, p_ua_hash, p_referer, p_utm);
END; $$;
GRANT EXECUTE ON FUNCTION public.log_referral_click(text,text,text,text,jsonb) TO anon, authenticated;

-- 5) Rewrite claim_referral: mark PENDING, run fraud checks, only reward if clean
CREATE OR REPLACE FUNCTION public.claim_referral(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_already uuid;
  v_code text := upper(trim(coalesce(p_code,'')));
  v_score numeric := 0;
  v_reason text := '';
  v_phone_ok boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_code = '' THEN RETURN jsonb_build_object('ok',false,'reason','empty_code'); END IF;

  SELECT referrer_id INTO v_referrer FROM public.referrals WHERE upper(code)=v_code LIMIT 1;
  IF v_referrer IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','invalid_code'); END IF;
  IF v_referrer = v_uid THEN RETURN jsonb_build_object('ok',false,'reason','self_referral'); END IF;

  SELECT referred_by INTO v_already FROM public.profiles WHERE id=v_uid;
  IF v_already IS NOT NULL THEN RETURN jsonb_build_object('ok',false,'reason','already_referred'); END IF;

  -- fraud heuristics
  -- (a) same phone as referrer
  IF EXISTS (
    SELECT 1 FROM public.profiles a JOIN public.profiles b ON a.id=v_uid AND b.id=v_referrer
     WHERE a.phone IS NOT NULL AND a.phone = b.phone
  ) THEN v_score := v_score + 0.6; v_reason := v_reason || 'same_phone;'; END IF;

  -- (b) phone confirmed?
  SELECT (u.phone_confirmed_at IS NOT NULL) INTO v_phone_ok FROM auth.users u WHERE u.id = v_uid;

  UPDATE public.profiles SET referred_by = v_referrer, updated_at = now() WHERE id = v_uid;

  INSERT INTO public.referral_verifications(referrer_id, referred_id, code, status, fraud_score, fraud_reason)
    VALUES (v_referrer, v_uid, v_code,
            CASE WHEN v_score >= 0.5 THEN 'flagged'::referral_status ELSE 'pending'::referral_status END,
            v_score, nullif(v_reason,''))
    ON CONFLICT (referred_id) DO NOTHING;

  -- If phone already confirmed and score clean, auto-verify + reward
  IF v_phone_ok AND v_score < 0.5 THEN
    PERFORM public.verify_referral(v_uid);
  END IF;

  RETURN jsonb_build_object('ok',true,'referrer',v_referrer,'pending',NOT (v_phone_ok AND v_score<0.5));
END; $$;

-- 6) verify_referral: idempotent reward when the referred user completes verification
CREATE OR REPLACE FUNCTION public.verify_referral(p_referred_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_row public.referral_verifications%ROWTYPE;
  v_new_count int;
  v_upgrade boolean := false;
BEGIN
  SELECT * INTO v_row FROM public.referral_verifications WHERE referred_id = p_referred_id;
  IF v_row.id IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','no_pending'); END IF;
  IF v_row.status IN ('rewarded','flagged') THEN
    RETURN jsonb_build_object('ok',true,'status',v_row.status::text);
  END IF;

  -- Reward atomically & idempotently (unique index on user_points_log(ref_type, ref_id))
  BEGIN
    INSERT INTO public.user_points_log(user_id, points, reason, ref_type, ref_id)
      VALUES (v_row.referrer_id, 50, 'referral_verified', 'referral_verified', v_row.id::text);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok',true,'status','already_rewarded');
  END;

  UPDATE public.profiles SET points = points + 50, updated_at = now() WHERE id = v_row.referrer_id;
  UPDATE public.referrals SET uses_count = uses_count + 1, reward_total = reward_total + 50
    WHERE referrer_id = v_row.referrer_id
    RETURNING uses_count INTO v_new_count;

  UPDATE public.referral_verifications
     SET status='rewarded', verified_at=coalesce(verified_at, now()), rewarded_at=now()
   WHERE id = v_row.id;

  -- Mark linked click as converted
  UPDATE public.referral_clicks
     SET converted = true, converted_user = p_referred_id
   WHERE upper(code) = v_row.code AND converted = false
     AND clicked_at > now() - interval '30 days';

  -- Every 5 verified -> +30 days full membership
  IF v_new_count IS NOT NULL AND v_new_count > 0 AND v_new_count % 5 = 0 THEN
    v_upgrade := true;
    UPDATE public.profiles
       SET membership='full'::membership_tier,
           membership_expires_at = GREATEST(coalesce(membership_expires_at, now()), now()) + interval '30 days',
           updated_at = now()
     WHERE id = v_row.referrer_id;
  END IF;

  RETURN jsonb_build_object('ok',true,'status','rewarded','uses_count',v_new_count,'upgraded',v_upgrade);
END; $$;
GRANT EXECUTE ON FUNCTION public.verify_referral(uuid) TO authenticated, service_role;

-- 7) Auto-verify when auth.users.phone_confirmed_at gets set
CREATE OR REPLACE FUNCTION public.on_phone_confirmed_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.phone_confirmed_at IS NOT NULL AND (OLD.phone_confirmed_at IS NULL) THEN
    PERFORM public.verify_referral(NEW.id);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_verify_referral_on_phone ON auth.users;
CREATE TRIGGER trg_verify_referral_on_phone
  AFTER UPDATE OF phone_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.on_phone_confirmed_trigger();

-- 8) Leaderboard view (top referrers)
CREATE OR REPLACE VIEW public.referral_leaderboard_v AS
  SELECT r.referrer_id,
         p.pseudonym,
         p.avatar_url,
         r.uses_count,
         r.reward_total,
         (SELECT count(*) FROM public.referral_clicks c
            WHERE upper(c.code) = upper(r.code)) AS clicks,
         CASE WHEN (SELECT count(*) FROM public.referral_clicks c
                     WHERE upper(c.code) = upper(r.code)) > 0
              THEN round(r.uses_count::numeric /
                    (SELECT count(*) FROM public.referral_clicks c
                       WHERE upper(c.code) = upper(r.code))::numeric, 3)
              ELSE 0 END AS conversion_rate
    FROM public.referrals r
    LEFT JOIN public.profiles p ON p.id = r.referrer_id
   WHERE r.uses_count > 0
   ORDER BY r.uses_count DESC
   LIMIT 100;
GRANT SELECT ON public.referral_leaderboard_v TO anon, authenticated;
