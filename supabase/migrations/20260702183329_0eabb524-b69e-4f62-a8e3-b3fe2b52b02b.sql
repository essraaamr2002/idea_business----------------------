
REVOKE ALL ON FUNCTION public.sm_compute_account_value(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sm_evaluate_margin_loan(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sm_accrue_daily_margin_interest() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sm_compute_account_value(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sm_evaluate_margin_loan(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.sm_accrue_daily_margin_interest() TO service_role;

REVOKE SELECT ON public.mv_sm_project_daily_stats FROM anon;
