import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AdsDashboard } from "@/components/AdsDashboard";

export const Route = createFileRoute("/ads")({
  head: () => ({ meta: [{ title: "إعلاناتي" }] }),
  component: AdsRoute,
});

function AdsRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname === "/ads" ? <AdsDashboard /> : <Outlet />;
}
