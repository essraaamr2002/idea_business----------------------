
-- Add new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kyc_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'compliance_officer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'idea_owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lawyer';
