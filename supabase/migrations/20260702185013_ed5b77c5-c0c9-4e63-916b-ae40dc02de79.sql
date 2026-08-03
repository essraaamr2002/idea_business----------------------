
-- Fix 1: Restrict materialized views from Data API (revoke from anon/authenticated)
REVOKE ALL ON public.mv_sm_project_daily_stats FROM anon, authenticated;
REVOKE ALL ON public.sm_mv_daily_stats FROM anon, authenticated;
REVOKE ALL ON public.market_stats_mv FROM anon, authenticated;

-- Fix 2: Add explicit deny-all policies for internal service tables so RLS-enabled has policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.idempotency_keys'::regclass) THEN
    EXECUTE 'CREATE POLICY "service_only_idempotency" ON public.idempotency_keys FOR ALL TO authenticated USING (false) WITH CHECK (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.market_rate_limits'::regclass) THEN
    EXECUTE 'CREATE POLICY "service_only_rate_limits" ON public.market_rate_limits FOR ALL TO authenticated USING (false) WITH CHECK (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.job_queue'::regclass) THEN
    EXECUTE 'CREATE POLICY "service_only_job_queue" ON public.job_queue FOR ALL TO authenticated USING (false) WITH CHECK (false)';
  END IF;
END $$;

-- Fix 3: Revoke EXECUTE on internal trigger/helper functions (they're called only by triggers or service_role)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'community_posts_guard_owner_update()',
    'on_phone_confirmed_trigger()',
    'sm_after_trade_move_shares()',
    'sm_after_trade_update_price()',
    'sm_trg_notify_margin_status()',
    'sm_trg_reevaluate_margin_after_trade()',
    'tg_block_message_if_blocked()',
    'trg_award_on_new_post()',
    'trg_award_on_post_comment()',
    'trg_award_on_post_like()',
    'trg_award_on_post_repost()',
    'notify_message_recipients()',
    'notify_price_change()',
    'notify_price_watchers()',
    'anti_snipe_extend_auction()',
    'apply_kyc_approval_to_profile()',
    'issue_invoice_on_paid()',
    'email_queue_dispatch()',
    'email_queue_wake()',
    'sm_match_order(uuid)',
    'sm_bootstrap_wallets()',
    'sm_grant_platform_shares()',
    'refresh_market_stats()'
  ]
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM anon, authenticated, PUBLIC', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;
