import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/saved")({
  head: () => ({ meta: [
    { title: "المحفوظات | IDEA BUSINESS" },
    { name: "description", content: "بحوثك ومشاريعك المحفوظة." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Bookmark className="h-6 w-6" />} title="المحفوظات" subtitle="عناصرك المحفوظة بسهولة." />
        <EmptyState
          title="لا يوجد محفوظ بعد"
          description="احفظ المشاريع المثيرة لاهتمامك للوصول إليها بسرعة لاحقاً."
          action={<Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">استكشف المشاريع</Link>}
        />
      </main>
    </div>
  ),
});
