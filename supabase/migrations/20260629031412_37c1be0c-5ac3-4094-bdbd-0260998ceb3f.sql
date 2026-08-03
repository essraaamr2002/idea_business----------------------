
-- 1) Sequence for human-readable invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoices_seq START 100001;

-- 2) Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_intent_id UUID REFERENCES public.payment_intents(id) ON DELETE SET NULL,
  order_id TEXT,
  provider TEXT,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  purpose TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'issued',
  metadata JSONB DEFAULT '{}'::jsonb,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoices_user_idx ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_order_idx ON public.invoices(order_id);

-- 3) GRANTs (Data API access)
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

-- 4) RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own invoices" ON public.invoices;
CREATE POLICY "users read own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_staff(auth.uid()));

-- 5) Auto-issue invoice when payment_intent flips to paid
CREATE OR REPLACE FUNCTION public.issue_invoice_on_paid()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_num TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'paid')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid') THEN

    -- avoid duplicates
    IF EXISTS (SELECT 1 FROM public.invoices WHERE payment_intent_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_num := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoices_seq')::text, 7, '0');

    INSERT INTO public.invoices(
      invoice_number, user_id, payment_intent_id, order_id, provider,
      amount, currency, purpose, transaction_id, status, metadata
    ) VALUES (
      v_num, NEW.user_id, NEW.id, NEW.order_id, NEW.provider,
      NEW.amount, NEW.currency, NEW.purpose, NEW.transaction_id, 'issued',
      COALESCE(NEW.metadata, '{}'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_issue_invoice_on_paid ON public.payment_intents;
CREATE TRIGGER trg_issue_invoice_on_paid
AFTER INSERT OR UPDATE OF status ON public.payment_intents
FOR EACH ROW EXECUTE FUNCTION public.issue_invoice_on_paid();

-- 6) Backfill: issue invoices for past paid payments without one
INSERT INTO public.invoices(invoice_number, user_id, payment_intent_id, order_id, provider, amount, currency, purpose, transaction_id, status, metadata, issued_at)
SELECT
  'INV-' || to_char(p.updated_at, 'YYYY') || '-' || lpad(nextval('public.invoices_seq')::text, 7, '0'),
  p.user_id, p.id, p.order_id, p.provider, p.amount, p.currency, p.purpose, p.transaction_id,
  'issued', COALESCE(p.metadata, '{}'::jsonb), p.updated_at
FROM public.payment_intents p
LEFT JOIN public.invoices i ON i.payment_intent_id = p.id
WHERE p.status = 'paid' AND i.id IS NULL;

-- 7) updated_at trigger
CREATE OR REPLACE FUNCTION public.invoices_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.invoices_touch_updated_at();
