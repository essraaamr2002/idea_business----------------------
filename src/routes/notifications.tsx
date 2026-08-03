import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "الإشعارات | IDEA BUSINESS" },
    { name: "description", content: "كل التحديثات الخاصة بحسابك ومشاريعك في مكان واحد." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Bell className="h-6 w-6" />} title="الإشعارات" subtitle="آخر التحديثات الخاصة بحسابك." />
        <EmptyState title="لا توجد إشعارات جديدة" description="سنخبرك فور حدوث تحديث على مشاريعك أو محفظتك." />
      </main>
    </div>
  ),
});
