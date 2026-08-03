
-- 1) Membership permissions matrix
CREATE TABLE public.agents_membership_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership membership_tier NOT NULL,
  agent_id text NOT NULL,
  allowed_tools text[] NOT NULL DEFAULT '{}',
  daily_quota int NOT NULL DEFAULT 50,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(membership, agent_id)
);
GRANT SELECT ON public.agents_membership_permissions TO authenticated;
GRANT ALL ON public.agents_membership_permissions TO service_role;
ALTER TABLE public.agents_membership_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_perm_read_authed" ON public.agents_membership_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "agents_perm_admin_write" ON public.agents_membership_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Agent sessions
CREATE TABLE public.agents_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  agent_scope text NOT NULL DEFAULT 'member' CHECK (agent_scope IN ('member','admin')),
  title text,
  message_count int NOT NULL DEFAULT 0,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agents_sessions_user_idx ON public.agents_sessions(user_id, agent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents_sessions TO authenticated;
GRANT ALL ON public.agents_sessions TO service_role;
ALTER TABLE public.agents_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_sessions_owner" ON public.agents_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- 3) Agent tool run audit log
CREATE TABLE public.agents_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.agents_sessions(id) ON DELETE SET NULL,
  agent_id text NOT NULL,
  agent_scope text NOT NULL DEFAULT 'member' CHECK (agent_scope IN ('member','admin')),
  tool_name text,
  input jsonb,
  output jsonb,
  success boolean NOT NULL DEFAULT true,
  error text,
  duration_ms int,
  membership_snapshot membership_tier,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agents_runs_user_idx ON public.agents_runs(user_id, created_at DESC);
CREATE INDEX agents_runs_agent_idx ON public.agents_runs(agent_id, created_at DESC);
GRANT SELECT, INSERT ON public.agents_runs TO authenticated;
GRANT ALL ON public.agents_runs TO service_role;
ALTER TABLE public.agents_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_runs_owner_read" ON public.agents_runs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "agents_runs_owner_insert" ON public.agents_runs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) Helper function
CREATE OR REPLACE FUNCTION public.agents_can_use_tool(
  _user_id uuid, _agent_id text, _tool text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.agents_membership_permissions ap
      ON ap.membership = p.membership
     AND ap.agent_id = _agent_id
    WHERE p.id = _user_id
      AND ap.enabled = true
      AND _tool = ANY(ap.allowed_tools)
  );
$$;

-- 5) Daily usage helper
CREATE OR REPLACE FUNCTION public.agents_today_usage(
  _user_id uuid, _agent_id text
) RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int FROM public.agents_runs
   WHERE user_id = _user_id
     AND agent_id = _agent_id
     AND created_at >= date_trunc('day', now());
$$;

-- 6) Updated_at trigger
CREATE TRIGGER agents_perm_touch BEFORE UPDATE ON public.agents_membership_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER agents_sessions_touch BEFORE UPDATE ON public.agents_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Seed default permissions
INSERT INTO public.agents_membership_permissions (membership, agent_id, allowed_tools, daily_quota) VALUES
  -- basic: قراءة فقط + روابط
  ('basic','commander',  ARRAY['get_my_profile','list_my_projects','platform_link','start_kyc'], 20),
  ('basic','developer',  ARRAY['get_my_profile','list_my_projects','platform_link'], 20),
  ('basic','designer',   ARRAY['get_my_profile','platform_link'], 20),
  ('basic','researcher', ARRAY['get_my_profile','list_my_projects','platform_link'], 20),
  ('basic','writer',     ARRAY['get_my_profile','platform_link'], 20),
  ('basic','analyst',    ARRAY['get_my_profile','list_my_projects','platform_link'], 20),

  -- silver: + تعديل ملف
  ('silver','commander',  ARRAY['get_my_profile','update_my_profile','list_my_projects','platform_link','start_kyc'], 50),
  ('silver','developer',  ARRAY['get_my_profile','list_my_projects','platform_link'], 50),
  ('silver','designer',   ARRAY['get_my_profile','platform_link'], 50),
  ('silver','researcher', ARRAY['get_my_profile','list_my_projects','platform_link'], 50),
  ('silver','writer',     ARRAY['get_my_profile','update_my_profile','platform_link'], 50),
  ('silver','analyst',    ARRAY['get_my_profile','list_my_projects','platform_link'], 50),

  -- gold: + bump_my_project
  ('gold','commander',  ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 150),
  ('gold','developer',  ARRAY['get_my_profile','list_my_projects','bump_my_project','platform_link'], 150),
  ('gold','designer',   ARRAY['get_my_profile','platform_link'], 150),
  ('gold','researcher', ARRAY['get_my_profile','list_my_projects','platform_link'], 150),
  ('gold','writer',     ARRAY['get_my_profile','update_my_profile','platform_link'], 150),
  ('gold','analyst',    ARRAY['get_my_profile','list_my_projects','bump_my_project','platform_link'], 150),

  -- platinum/full: كل الأدوات المتاحة للأعضاء
  ('platinum','commander',  ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),
  ('platinum','developer',  ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),
  ('platinum','designer',   ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),
  ('platinum','researcher', ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),
  ('platinum','writer',     ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),
  ('platinum','analyst',    ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 500),

  ('full','commander',  ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000),
  ('full','developer',  ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000),
  ('full','designer',   ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000),
  ('full','researcher', ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000),
  ('full','writer',     ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000),
  ('full','analyst',    ARRAY['get_my_profile','update_my_profile','list_my_projects','bump_my_project','platform_link','start_kyc'], 1000);
