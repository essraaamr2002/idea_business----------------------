import { createFileRoute, Navigate } from "@tanstack/react-router";
import { OAuthInitiatePage } from "@/components/OAuthInitiatePage";

export const Route = createFileRoute("/$oauth/initiate")({
  component: OAuthInitiateRoute,
});

function OAuthInitiateRoute() {
  const params = Route.useParams();
  const search = Route.useSearch() as { provider?: string; redirect_uri?: string };

  if (params.oauth !== "~oauth") {
    return <Navigate to="/auth" replace />;
  }

  return <OAuthInitiatePage search={search} />;
}

