import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/sustainability")({
  head: () => ({
    meta: [
      { title: "الاستدامة | IDEA BUSINESS" },
      { name: "description", content: "التزامنا بمعايير الاستدامة والحوكمة والمسؤولية." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Leaf className="h-6 w-6" />} title="الاستدامة (ESG)" subtitle="نلتزم بمعايير البيئة والمجتمع والحوكمة." />
        <div className="prose prose-invert max-w-none space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>نولي أهمية قصوى لدعم المشاريع المتوافقة مع رؤية 2030 والمساهمة في تحقيق أهداف التنمية المستدامة.</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>أولوية للمشاريع منخفضة الانبعاثات الكربونية.</li>
            <li>دعم المبادرات النسائية وريادة الشباب.</li>
            <li>الإفصاح الشفاف عن الأثر الاجتماعي للمشاريع.</li>
            <li>حوكمة داخلية موثقة ومراجعات سنوية.</li>
          </ul>
        </div>
      </main>
    </div>
  ),
});
