import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { GoalTracker } from "@/components/GoalTracker";
import { Target } from "lucide-react";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "أهدافي المالية | IDEA BUSINESS" },
      { name: "description", content: "حدد أهدافك المالية وتتبع تقدمك نحو تحقيقها." },
      { property: "og:title", content: "أهدافي المالية — IDEA BUSINESS" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Target className="h-6 w-6" />} title="أهدافي المالية" subtitle="خطط لمستقبلك المالي وتابع تقدمك." />
        <GoalTracker />
      </main>
    </div>
  ),
});
