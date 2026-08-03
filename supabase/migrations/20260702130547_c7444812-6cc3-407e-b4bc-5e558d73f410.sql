
ALTER TABLE public.news_subscribers
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_token text;

CREATE UNIQUE INDEX IF NOT EXISTS news_subscribers_confirm_token_key
  ON public.news_subscribers (confirm_token) WHERE confirm_token IS NOT NULL;
