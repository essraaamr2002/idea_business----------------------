
-- Tighten project_guarantees: block direct user INSERT; require admin or service_role.
-- Owners must submit via a server function (status defaults to pending_review).
DROP POLICY IF EXISTS guarantees_owner_insert ON public.project_guarantees;

CREATE POLICY guarantees_admin_insert
  ON public.project_guarantees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Server function to submit a guarantee request (no PII columns allowed)
CREATE OR REPLACE FUNCTION public.submit_project_guarantee(
  p_project_id uuid,
  p_amount numeric,
  p_currency text DEFAULT 'SAR',
  p_guarantor_name text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'invalid amount'; END IF;

  SELECT owner_id INTO v_owner FROM public.projects WHERE id = p_project_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'project not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Basic per-user rate limit: 5 submissions / hour
  IF NOT public.check_rate_limit(auth.uid(), NULL, 'submit_guarantee', 5, 3600) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;

  INSERT INTO public.project_guarantees(project_id, amount, currency, guarantor_name, notes, status)
  VALUES (p_project_id, p_amount, COALESCE(p_currency,'SAR'), p_guarantor_name, p_notes, 'pending_review')
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;

REVOKE ALL ON FUNCTION public.submit_project_guarantee(uuid, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_project_guarantee(uuid, numeric, text, text, text) TO authenticated;
