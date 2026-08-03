
-- Tighten platform_settings read access to admin/accountant only (was admin/moderator/accountant/support/seo)
DROP POLICY IF EXISTS settings_staff_read ON public.platform_settings;
CREATE POLICY settings_admin_accountant_read
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));

-- Make projects public-read policy explicit about scope. Column-level grants
-- already exclude phone/whatsapp from anon/authenticated SELECT, but make the
-- policy intent explicit to satisfy scanners and future maintainers.
COMMENT ON COLUMN public.projects.phone IS 'PII: never granted to anon/authenticated. Read via get_project_contact() RPC only.';
COMMENT ON COLUMN public.projects.whatsapp IS 'PII: never granted to anon/authenticated. Read via get_project_whatsapp() RPC only.';

-- Defensive re-revoke in case any later migration widened column grants
REVOKE SELECT (phone, whatsapp) ON public.projects FROM anon, authenticated;
