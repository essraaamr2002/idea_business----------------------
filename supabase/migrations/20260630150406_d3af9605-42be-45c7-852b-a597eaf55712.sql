
-- 1) Tighten admin read: admin role only (no more moderator)
DROP POLICY IF EXISTS guarantees_admin_read ON public.project_guarantees;
CREATE POLICY guarantees_admin_read
ON public.project_guarantees
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Masking helper
CREATE OR REPLACE FUNCTION public.mask_tail4(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN input IS NULL OR length(input) = 0 THEN NULL
    WHEN length(input) <= 4 THEN repeat('*', length(input))
    ELSE repeat('*', length(input) - 4) || right(input, 4)
  END
$$;

-- 3) Owner-facing SECURITY DEFINER function returning ONLY masked PII.
--    The app should call this RPC instead of selecting plaintext columns directly.
CREATE OR REPLACE FUNCTION public.get_my_guarantee_masked(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  guarantee_type text,
  amount numeric,
  currency text,
  guarantor_name text,
  guarantor_phone_masked text,
  guarantor_id_masked text,
  guarantor_passport_masked text,
  signed_to_name text,
  signed_to_id_masked text,
  signed_to_passport_masked text,
  document_url text,
  notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must own the project
  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    g.id,
    g.project_id,
    g.guarantee_type,
    g.amount,
    g.currency,
    g.guarantor_name,
    public.mask_tail4(g.guarantor_phone),
    public.mask_tail4(g.guarantor_id),
    public.mask_tail4(g.guarantor_passport_enc),
    g.signed_to_name,
    public.mask_tail4(g.signed_to_id),
    public.mask_tail4(g.signed_to_passport),
    g.document_url,
    g.notes,
    g.created_at
  FROM public.project_guarantees g
  WHERE g.project_id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_guarantee_masked(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_guarantee_masked(uuid) TO authenticated;

COMMENT ON COLUMN public.project_guarantees.guarantor_phone IS 'DEPRECATED plaintext — read via get_my_guarantee_masked() (returns masked). Encrypted copy in guarantor_phone_enc.';
COMMENT ON COLUMN public.project_guarantees.guarantor_id IS 'DEPRECATED plaintext — read via get_my_guarantee_masked() (returns masked).';
COMMENT ON COLUMN public.project_guarantees.signed_to_id IS 'DEPRECATED plaintext — read via get_my_guarantee_masked() (returns masked).';
COMMENT ON COLUMN public.project_guarantees.signed_to_passport IS 'DEPRECATED plaintext — read via get_my_guarantee_masked() (returns masked).';
