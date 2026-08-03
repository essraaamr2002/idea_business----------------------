import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "moderator"
  | "seo"
  | "user"
  | "accountant"
  | "support"
  | "kyc_admin"
  | "compliance_officer"
  | "idea_owner"
  | "lawyer";

const STAFF_ROLES: AppRole[] = [
  "admin",
  "moderator",
  "seo",
  "accountant",
  "support",
  "kyc_admin",
  "compliance_officer",
  "lawyer",
];

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  rolesLoading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isSeo: boolean;
  isAdminOrSeo: boolean;
  isStaff: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .then(({ data, error }) => {
        if (error) console.error("[useAuth] roles fetch error:", error);
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoading(false);
      });
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthCtx>(() => {
    const hasRole = (r: AppRole) => roles.includes(r);
    const hasAnyRole = (rs: AppRole[]) => rs.some((r) => roles.includes(r));
    const isAdmin = hasRole("admin");
    const isSeo = hasRole("seo");
    return {
      user: session?.user ?? null,
      session,
      loading,
      rolesLoading,
      roles,
      isAdmin,
      isSeo,
      isAdminOrSeo: isAdmin || isSeo,
      isStaff: hasAnyRole(STAFF_ROLES),
      hasRole,
      hasAnyRole,
      signOut,
    };
  }, [session, loading, rolesLoading, roles]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
