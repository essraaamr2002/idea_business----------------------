-- Persist the exact fee quote shown to the investor when a direct purchase
-- request is created. VAT is 15% of the 7% platform commission.
ALTER TABLE public.project_purchase_requests
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric(20,4),
  ADD COLUMN IF NOT EXISTS platform_commission_rate numeric(8,6) NOT NULL DEFAULT 0.07,
  ADD COLUMN IF NOT EXISTS platform_commission_amount numeric(20,4),
  ADD COLUMN IF NOT EXISTS vat_rate numeric(8,6) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS vat_amount numeric(20,4),
  ADD COLUMN IF NOT EXISTS payable_total numeric(20,4);

COMMENT ON COLUMN public.project_purchase_requests.vat_amount
  IS 'VAT charged on the platform commission, not on the investment principal.';
