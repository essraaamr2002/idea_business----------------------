ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS service_key TEXT;
CREATE INDEX IF NOT EXISTS auctions_service_key_idx ON public.auctions(service_key);