import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tag } from "@/components/Tag";
import { ListChecks } from "lucide-react";

const ITEMS = [
  { t: "حقق هويتك (KYC)", done: true },
  { t: "أضف وسيلة دفع", done: true },
  { t: "حدد ملف المخاطر", done: false },
  { t: "خطّط لأول استثمار", done: false },
  { t: "فعّل المصادقة الثنائية", done: false },
];

export const Route = createFileRoute("/checklist")({
  head: () => ({
    meta: [
      { title: "قائمة البداية | IDEA BUSINESS" },
      { name: "description", content: "خطوات تأكيد إعداد حسابك بأمان." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<ListChecks className="h-6 w-6" />} title="قائمة الإعداد" subtitle="أكمل هذه الخطوات لتجربة كاملة." />
        <ul className="space-y-2">
          {ITEMS.map((it, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-4 py-3">
              <span className={it.done ? "line-through text-muted-foreground" : "font-medium"}>{it.t}</span>
              {it.done ? <Tag tone="success">مكتمل</Tag> : <Tag tone="warning">قيد التنفيذ</Tag>}
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
