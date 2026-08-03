import { createFileRoute } from "@tanstack/react-router";
import { AdsDashboard } from "@/components/AdsDashboard";

export const Route = createFileRoute("/ads/")({
  head: () => ({ meta: [{ title: "إعلاناتي" }] }),
  component: AdsDashboard,
});