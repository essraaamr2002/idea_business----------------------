ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS services_enabled JSONB NOT NULL DEFAULT '{"auction_live":false,"auction_sealed":false,"tender_live":false,"tender_sealed":false}'::jsonb;