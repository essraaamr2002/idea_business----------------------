
CREATE TYPE public.offer_status AS ENUM ('pending','accepted','rejected','countered','withdrawn','expired');

CREATE TABLE public.investment_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'SAR',
  shares integer NOT NULL CHECK (shares > 0),
  price_per_share numeric NOT NULL CHECK (price_per_share > 0),
  message text,
  status public.offer_status NOT NULL DEFAULT 'pending',
  parent_offer_id uuid REFERENCES public.investment_offers(id) ON DELETE SET NULL,
  responded_at timestamptz,
  response_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_project ON public.investment_offers(project_id, created_at DESC);
CREATE INDEX idx_offers_investor ON public.investment_offers(investor_id, created_at DESC);
CREATE INDEX idx_offers_owner ON public.investment_offers(owner_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.investment_offers TO authenticated;
GRANT ALL ON public.investment_offers TO service_role;

ALTER TABLE public.investment_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_select_participant"
  ON public.investment_offers FOR SELECT TO authenticated
  USING (investor_id = auth.uid() OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "offers_insert_investor"
  ON public.investment_offers FOR INSERT TO authenticated
  WITH CHECK (investor_id = auth.uid() AND owner_id <> auth.uid());

CREATE POLICY "offers_update_participant"
  ON public.investment_offers FOR UPDATE TO authenticated
  USING (investor_id = auth.uid() OR owner_id = auth.uid())
  WITH CHECK (investor_id = auth.uid() OR owner_id = auth.uid());

CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.investment_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Negotiation thread messages
CREATE TABLE public.investment_offer_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.investment_offers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offer_msgs_offer ON public.investment_offer_messages(offer_id, created_at);

GRANT SELECT, INSERT ON public.investment_offer_messages TO authenticated;
GRANT ALL ON public.investment_offer_messages TO service_role;

ALTER TABLE public.investment_offer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_msgs_select_participant"
  ON public.investment_offer_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.investment_offers o
    WHERE o.id = offer_id
      AND (o.investor_id = auth.uid() OR o.owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  ));

CREATE POLICY "offer_msgs_insert_participant"
  ON public.investment_offer_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.investment_offers o
      WHERE o.id = offer_id AND (o.investor_id = auth.uid() OR o.owner_id = auth.uid())
    )
  );
