import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OAuthInitiatePage } from "@/components/OAuthInitiatePage";

export const Route = createFileRoute("/$legacy/oauth/initiate")({
  component: LegacyOAuthInitiateRoute,
});

function LegacyOAuthInitiateRoute() {
  const params = Route.useParams();
  const search = Route.useSearch() as { provider?: string; redirect_uri?: string };

  if (params.legacy !== "~") {
    return <Navigate to="/auth" replace />;
  }

  return <OAuthInitiatePage search={search} />;
}
