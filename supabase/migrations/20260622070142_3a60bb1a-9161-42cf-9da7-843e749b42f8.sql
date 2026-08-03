
-- ============= PRODUCTS & SERVICES CATALOG =============
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.product_categories FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categories_admin_write" ON public.product_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sku text UNIQUE,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  short_description text,
  description text,
  type text NOT NULL DEFAULT 'physical', -- physical|digital|service|subscription
  price numeric(14,2) NOT NULL DEFAULT 0,
  compare_at_price numeric(14,2),
  currency text NOT NULL DEFAULT 'USD',
  tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  stock int,
  unlimited_stock boolean NOT NULL DEFAULT false,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL DEFAULT ('ORD-' || to_char(now(),'YYYYMMDD') || '-' || substring(gen_random_uuid()::text,1,8)),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text,
  customer_email text,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending', -- pending|paid|processing|shipped|delivered|cancelled|refunded
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  shipping_amount numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  shipping_address jsonb,
  billing_address jsonb,
  notes text,
  tracking_number text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_orders TO authenticated;
GRANT ALL ON public.product_orders TO service_role;
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_owner_read" ON public.product_orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_create" ON public.product_orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_admin_write" ON public.product_orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_admin_delete" ON public.product_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.product_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL,
  total_price numeric(14,2) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_order_items TO authenticated;
GRANT ALL ON public.product_order_items TO service_role;
ALTER TABLE public.product_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_read" ON public.product_order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.product_orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "order_items_admin_write" ON public.product_order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= INTEGRATIONS =============
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL, -- sms|email|crm|chat|storage|analytics
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_test_at timestamptz,
  last_test_status text,
  last_test_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_settings TO authenticated;
GRANT ALL ON public.integration_settings TO service_role;
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_admin_all" ON public.integration_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  action text NOT NULL,
  status text NOT NULL, -- success|error
  recipient text,
  payload jsonb,
  response jsonb,
  error text,
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "intlogs_admin_read" ON public.integration_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "intlogs_admin_insert" ON public.integration_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= AUTOMATIONS =============
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_event text NOT NULL, -- user.created|project.created|order.created|kyc.submitted|payout.requested|dispute.opened
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  run_count int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_admin_all" ON public.automation_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  status text NOT NULL,
  input jsonb,
  output jsonb,
  error text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_admin_read" ON public.automation_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "runs_admin_insert" ON public.automation_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= BROADCASTS =============
CREATE TABLE public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL, -- sms|email|push|inapp
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  subject text,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft|scheduled|sending|sent|failed
  scheduled_at timestamptz,
  sent_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_campaigns TO authenticated;
GRANT ALL ON public.broadcast_campaigns TO service_role;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broadcast_admin_all" ON public.broadcast_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= CMS =============
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta_description text,
  is_published boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_public_read" ON public.cms_pages FOR SELECT USING (is_published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pages_admin_write" ON public.cms_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cms_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL, -- home_top|home_middle|sidebar|footer
  title text,
  subtitle text,
  image_url text,
  link_url text,
  cta_label text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cms_banners TO authenticated;
GRANT ALL ON public.cms_banners TO service_role;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners_public_read" ON public.cms_banners FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "banners_admin_write" ON public.cms_banners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============= updated_at triggers =============
CREATE TRIGGER trg_product_categories_uat BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_uat BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_product_orders_uat BEFORE UPDATE ON public.product_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_integration_settings_uat BEFORE UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_automation_rules_uat BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_broadcast_uat BEFORE UPDATE ON public.broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cms_pages_uat BEFORE UPDATE ON public.cms_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cms_banners_uat BEFORE UPDATE ON public.cms_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default integration providers
INSERT INTO public.integration_settings (provider, display_name, category, enabled) VALUES
  ('twilio_sms', 'Twilio SMS', 'sms', false),
  ('gatewayapi_sms', 'GatewayAPI SMS', 'sms', false),
  ('twilio_whatsapp', 'Twilio WhatsApp', 'sms', false),
  ('resend_email', 'Resend Email', 'email', false),
  ('brevo_email', 'Brevo Email', 'email', false),
  ('mailgun_email', 'Mailgun Email', 'email', false),
  ('hubspot_crm', 'HubSpot CRM', 'crm', false),
  ('salesforce_crm', 'Salesforce', 'crm', false),
  ('pipedrive_crm', 'Pipedrive', 'crm', false),
  ('zoho_crm', 'Zoho CRM', 'crm', false),
  ('slack_chat', 'Slack', 'chat', false),
  ('telegram_chat', 'Telegram', 'chat', false),
  ('teams_chat', 'Microsoft Teams', 'chat', false),
  ('google_drive', 'Google Drive', 'storage', false),
  ('onedrive', 'Microsoft OneDrive', 'storage', false),
  ('google_analytics', 'Google Analytics', 'analytics', false),
  ('semrush', 'Semrush', 'analytics', false)
ON CONFLICT (provider) DO NOTHING;
