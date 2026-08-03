
-- 1) Catalog
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('payment','whatsapp','sms','email','seo','shipping','cms','other')),
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  docs_url TEXT,
  config_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_oauth BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.providers TO anon, authenticated;
GRANT ALL ON public.providers TO service_role;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers readable to all" ON public.providers FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "providers admin write" ON public.providers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2) Tenant configs (single-tenant here; tenant_id nullable for future)
CREATE TABLE public.tenant_provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected','error')),
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_provider_configs TO authenticated;
GRANT ALL ON public.tenant_provider_configs TO service_role;
ALTER TABLE public.tenant_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "provider configs admin only" ON public.tenant_provider_configs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) Webhook logs
CREATE TABLE public.provider_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  tenant_id UUID,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','failed')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.provider_webhook_logs TO authenticated;
GRANT ALL ON public.provider_webhook_logs TO service_role;
ALTER TABLE public.provider_webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook logs admin read" ON public.provider_webhook_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tpc_updated BEFORE UPDATE ON public.tenant_provider_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed catalog
INSERT INTO public.providers (slug, category, name, description, docs_url, requires_oauth, sort_order, config_schema) VALUES
('stripe','payment','Stripe','بوابة دفع عالمية بطاقات + Apple/Google Pay','https://stripe.com/docs',false,10,
 '[{"key":"secret_key","label":"Secret Key","type":"password","required":true},{"key":"publishable_key","label":"Publishable Key","type":"text","required":true},{"key":"webhook_secret","label":"Webhook Secret","type":"password","required":false}]'::jsonb),
('tap','payment','Tap Payments','بوابة دفع خليجية (السعودية/الإمارات/الكويت)','https://developers.tap.company',false,20,
 '[{"key":"secret_key","label":"Secret Key","type":"password","required":true},{"key":"public_key","label":"Public Key","type":"text","required":true}]'::jsonb),
('paytabs','payment','PayTabs','بوابة دفع للسعودية ومصر','https://site.paytabs.com/en/developers/',false,30,
 '[{"key":"profile_id","label":"Profile ID","type":"text","required":true},{"key":"server_key","label":"Server Key","type":"password","required":true},{"key":"region","label":"Region","type":"select","options":["ARE","SAU","EGY","OMN","JOR","GLOBAL"],"required":true}]'::jsonb),
('twilio-wa','whatsapp','Twilio WhatsApp','WhatsApp Business API عبر Twilio','https://www.twilio.com/docs/whatsapp',false,40,
 '[{"key":"account_sid","label":"Account SID","type":"text","required":true},{"key":"auth_token","label":"Auth Token","type":"password","required":true},{"key":"from_number","label":"From (whatsapp:+...)","type":"text","required":true}]'::jsonb),
('360dialog','whatsapp','360dialog','WhatsApp Business API مباشر','https://docs.360dialog.com',false,50,
 '[{"key":"api_key","label":"API Key","type":"password","required":true},{"key":"phone_number_id","label":"Phone Number ID","type":"text","required":true}]'::jsonb),
('resend','email','Resend','خدمة إرسال بريد المعاملات','https://resend.com/docs',false,60,
 '[{"key":"api_key","label":"API Key","type":"password","required":true},{"key":"from_email","label":"From Email","type":"text","required":true}]'::jsonb),
('wordpress-headless','cms','WordPress Headless','ربط جزئي للمدوّنة عبر WP REST API','https://developer.wordpress.org/rest-api/',false,70,
 '[{"key":"site_url","label":"WP Site URL","type":"text","required":true},{"key":"username","label":"Username","type":"text","required":false},{"key":"app_password","label":"Application Password","type":"password","required":false}]'::jsonb);
