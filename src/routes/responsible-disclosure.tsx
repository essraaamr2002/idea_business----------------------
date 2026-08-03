import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bug } from "lucide-react";

export const Route = createFileRoute("/responsible-disclosure")({
  head: () => ({ meta: [
    { title: "الإفصاح المسؤول | IDEA BUSINESS" },
    { name: "description", content: "كيفية الإبلاغ عن الثغرات الأمنية بشكل مسؤول." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Bug className="h-6 w-6" />} title="الإفصاح المسؤول" subtitle="ساعدنا في حماية مستخدمينا." />
        <div className="space-y-4 text-sm leading-7">
          <p>إذا اكتشفت ثغرة أمنية، يرجى التواصل معنا عبر <a href="mailto:security@busniss.org" className="font-extrabold text-primary hover:underline">security@busniss.org</a> قبل الإفصاح العلني.</p>
          <ul className="space-y-2 rounded-2xl border border-border bg-card/60 p-5">
            <li>• امنحنا وقتاً معقولاً للإصلاح قبل النشر.</li>
            <li>• لا تستغل الثغرة بما يضر المستخدمين أو البيانات.</li>
            <li>• سنقدّر مساهمتك ضمن صفحة الباحثين الأمنيين.</li>
          </ul>
        </div>
      </main>
    </div>
  ),
});
