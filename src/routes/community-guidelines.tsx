import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Users } from "lucide-react";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({ meta: [
    { title: "إرشادات المجتمع | IDEA BUSINESS" },
    { name: "description", content: "قواعد التعامل والمشاركة على منصة IDEA BUSINESS." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Users className="h-6 w-6" />} title="إرشادات المجتمع" subtitle="مجتمع آمن ومحترم للجميع." />
        <div className="space-y-3 text-sm leading-7">
          {["الاحترام المتبادل بين جميع الأعضاء.","لا تحريض، لا كراهية، ولا تنمّر.","لا نصب أو ترويج لمشاريع وهمية.","لا مشاركة لمحتوى ينتهك حقوق الملكية.","الالتزام بصدق المعلومة وعدم نشر الشائعات."].map((g) => (
            <div key={g} className="rounded-2xl border border-border bg-card/60 p-4">{g}</div>
          ))}
        </div>
      </main>
    </div>
  ),
});
