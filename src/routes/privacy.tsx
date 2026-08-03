import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية | IDEA BUSINESS" },
      { name: "description", content: "كيف نجمع بياناتك ونحميها ونستخدمها على منصة IDEA BUSINESS." },
      { property: "og:title", content: "سياسة الخصوصية — IDEA BUSINESS" },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: { h: string; p: string }[] = [
  { h: "البيانات التي نجمعها", p: "نجمع البيانات اللازمة لتشغيل الحساب: الاسم، البريد، رقم الهاتف، بيانات KYC، وبيانات الاستخدام لتحسين التجربة." },
  { h: "كيفية الاستخدام", p: "نستخدم البيانات للتحقّق من الهوية، معالجة المعاملات، الدعم الفنّي، ومنع الاحتيال." },
  { h: "المشاركة مع أطراف ثالثة", p: "لا نبيع بياناتك. نشاركها فقط مع مزودي الخدمة الأساسيين (مدفوعات، استضافة، تحقق) وفق اتفاقيات حماية صارمة." },
  { h: "حقوقك", p: "يحق لك طلب الوصول لبياناتك أو تعديلها أو حذفها عبر البريد support@busniss.org." },
  { h: "ملفات الكوكيز", p: "نستخدم الكوكيز لتحسين الأداء وقياس الاستخدام. يمكنك التحكم بها من إعدادات المتصفح." },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="سياسة الخصوصية" subtitle="آخر تحديث: 2026" />
        <div className="space-y-5">
          {SECTIONS.map((s) => (
            <section key={s.h} className="rounded-2xl border border-border bg-card/60 p-5">
              <h2 className="text-lg font-black">{s.h}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
