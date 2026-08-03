
-- Replace permissive INSERT policies with service_role-scoped ones
DROP POLICY IF EXISTS "Service role inserts security events" ON public.security_events;
CREATE POLICY "Service role inserts security events"
  ON public.security_events FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "System inserts audit" ON public.ad_audit_log;
CREATE POLICY "System inserts audit"
  ON public.ad_audit_log FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can record conversion" ON public.ad_conversions;
CREATE POLICY "Authenticated or service can record conversion"
  ON public.ad_conversions FOR INSERT TO authenticated, service_role
  WITH CHECK (true);

-- news_subscribers: add explicit INSERT policy enforcing email matches JWT
CREATE POLICY "news_subscribers_self_insert"
  ON public.news_subscribers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND email = (auth.jwt() ->> 'email'));
