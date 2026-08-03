import { createFileRoute, redirect } from "@tanstack/react-router";

// /projects هو الآن قسم "مشاريع المنصة" المُدمج في /community
export const Route = createFileRoute("/projects/")({
  beforeLoad: () => {
    throw redirect({ to: "/community" });
  },
  component: () => null,
});
