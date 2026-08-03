
-- Restrict column-level updates on share_orders and investment_offers via triggers,
-- preventing tampering with sensitive fields by participants/owners.

-- ===== share_orders =====
CREATE OR REPLACE FUNCTION public.share_orders_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If caller is service_role or admin, allow everything.
  IF (auth.jwt() ->> 'role') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Otherwise: only the owner can update, and ONLY to cancel.
  IF NEW.user_id <> OLD.user_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.side IS DISTINCT FROM OLD.side
     OR NEW.shares IS DISTINCT FROM OLD.shares
     OR NEW.price IS DISTINCT FROM OLD.price
     OR NEW.filled IS DISTINCT FROM OLD.filled
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'share_orders: only cancellation is allowed for self-updates';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'share_orders: status can only change to cancelled by owner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_share_orders_guard_update ON public.share_orders;
CREATE TRIGGER trg_share_orders_guard_update
BEFORE UPDATE ON public.share_orders
FOR EACH ROW EXECUTE FUNCTION public.share_orders_guard_update();

-- ===== investment_offers =====
CREATE OR REPLACE FUNCTION public.investment_offers_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (auth.jwt() ->> 'role') = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Immutable identity & financial terms cannot change post-insert.
  IF NEW.investor_id <> OLD.investor_id
     OR NEW.owner_id <> OLD.owner_id
     OR NEW.project_id <> OLD.project_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.shares IS DISTINCT FROM OLD.shares
     OR NEW.price_per_share IS DISTINCT FROM OLD.price_per_share
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'investment_offers: financial terms are immutable; create a counter-offer instead';
  END IF;

  -- Investor may only withdraw; owner may accept/reject/counter.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() = OLD.investor_id AND NEW.status NOT IN ('withdrawn') THEN
      RAISE EXCEPTION 'investment_offers: investor can only withdraw';
    END IF;
    IF auth.uid() = OLD.owner_id AND NEW.status NOT IN ('accepted','rejected','countered') THEN
      RAISE EXCEPTION 'investment_offers: owner can only accept/reject/counter';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_investment_offers_guard_update ON public.investment_offers;
CREATE TRIGGER trg_investment_offers_guard_update
BEFORE UPDATE ON public.investment_offers
FOR EACH ROW EXECUTE FUNCTION public.investment_offers_guard_update();
