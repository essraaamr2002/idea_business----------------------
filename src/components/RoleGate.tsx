import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";

interface RoleGateProps {
  roles?: AppRole[];
  role?: AppRole;
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on user roles.
 * - `role`: single role required
 * - `roles`: list of roles; matches if user has ANY (default) or ALL (`requireAll`)
 * - `fallback`: optional element to render when unauthorized (default: null)
 */
export function RoleGate({ roles, role, requireAll = false, fallback = null, children }: RoleGateProps) {
  const { rolesLoading, hasRole, hasAnyRole, roles: userRoles } = useAuth();
  if (rolesLoading) return null;
  const required = role ? [role] : roles ?? [];
  if (required.length === 0) return <>{children}</>;
  const allowed = requireAll
    ? required.every((r) => userRoles.includes(r))
    : hasAnyRole(required);
  return <>{allowed ? children : fallback}</>;
}
