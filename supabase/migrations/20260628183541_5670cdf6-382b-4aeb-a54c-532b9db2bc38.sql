CREATE TABLE public.fatora_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  kind TEXT NOT NULL CHECK (kind IN ('checkout_request','checkout_response','webhook_received','webhook_processed','refund_request','verify_request')),
  order_id TEXT,
  user_id UUID,
  transaction_id TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  http_status INT,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  signature_valid BOOLEAN,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fatora_logs_order ON public.fatora_logs(order_id);
CREATE INDEX idx_fatora_logs_user ON public.fatora_logs(user_id);
CREATE INDEX idx_fatora_logs_trace ON public.fatora_logs(trace_id);
CREATE INDEX idx_fatora_logs_created ON public.fatora_logs(created_at DESC);

GRANT SELECT ON public.fatora_logs TO authenticated;
GRANT ALL ON public.fatora_logs TO service_role;

ALTER TABLE public.fatora_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read fatora logs"
ON public.fatora_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));