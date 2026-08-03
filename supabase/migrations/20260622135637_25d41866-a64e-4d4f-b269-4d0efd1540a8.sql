
-- Fix 1: Set immutable search_path on function lacking it
ALTER FUNCTION public.tg_seo_meta_updated_at() SET search_path = public;

-- Fix 2: Remove the public INSERT policy on news_subscribers.
-- Subscriptions now go exclusively through the server function `subscribeNews`,
-- which uses the service-role client. This prevents anyone from harvesting
-- or spamming arbitrary email addresses into the table via the Data API.
DROP POLICY IF EXISTS news_subscribers_insert_anyone ON public.news_subscribers;
