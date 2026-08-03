CREATE TABLE IF NOT EXISTS public.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  quote_currency text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, quote_currency)
);

GRANT SELECT ON public.fx_rates TO anon, authenticated;
GRANT ALL ON public.fx_rates TO service_role;

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_rates readable by everyone"
  ON public.fx_rates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS fx_rates_quote_idx ON public.fx_rates (quote_currency);