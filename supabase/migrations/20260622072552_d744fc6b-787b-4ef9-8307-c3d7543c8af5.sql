
DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  COALESCE(NULLIF(alias_name, ''), display_name) AS display_name,
  avatar_url,
  bio,
  country,
  verified_green,
  verified_blue,
  membership,
  followers_count,
  points,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'profiles_public_display_read'
  ) THEN
    CREATE POLICY profiles_public_display_read
      ON public.profiles
      FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END $$;

REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, display_name, alias_name, use_alias_default, avatar_url, bio, country,
  verified_green, verified_blue, membership, followers_count, points,
  show_whatsapp, created_at
) ON public.profiles TO anon, authenticated;
GRANT SELECT (
  phone, whatsapp, date_of_birth, occupation, monthly_income, net_worth,
  kyc_status, kyc_document_url, kyc_selfie_url, membership_expires_at,
  updated_at, referred_by, nationality, monthly_obligations,
  phone_enc, dob_enc, national_id_enc
) ON public.profiles TO authenticated;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS access_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS support_tickets_access_token_idx
  ON public.support_tickets(access_token);

CREATE OR REPLACE FUNCTION public.get_ticket_by_token(p_token uuid)
RETURNS TABLE (
  id uuid,
  subject text,
  message text,
  status text,
  admin_reply text,
  replied_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, subject, message, status::text, admin_reply,
         replied_at, resolved_at, created_at
  FROM public.support_tickets
  WHERE access_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_ticket_by_token(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_ticket_by_token(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM public.support_tickets
   WHERE access_token = p_token AND user_id IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_ticket_by_token(uuid) TO anon, authenticated;
