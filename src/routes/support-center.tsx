import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Accordion } from "@/components/Accordion";
import { LifeBuoy } from "lucide-react";

const ITEMS = [
  { q: "كيف أبدأ كمستثمر؟", a: "أنشئ حسابك، أكمل التحقق KYC، ثم تصفّح المشاريع وابدأ بأي مبلغ يناسبك." },
  { q: "ما الحد الأدنى للاستثمار؟", a: "يبدأ من 100 ريال لمعظم المشاريع." },
  { q: "كيف أسحب أرباحي؟", a: "من صفحة المحفظة، اطلب تحويلًا لحسابك البنكي خلال 1-3 أيام عمل." },
  { q: "هل بياناتي آمنة؟", a: "نستخدم تشفيرًا متقدمًا وامتثالًا كاملًا للوائح حماية البيانات السعودية." },
];

export const Route = createFileRoute("/support-center")({
  head: () => ({
    meta: [
      { title: "مركز الدعم | IDEA BUSINESS" },
      { name: "description", content: "إجابات على الأسئلة الشائعة وطرق التواصل مع الدعم." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<LifeBuoy className="h-6 w-6" />} title="مركز الدعم" subtitle="نحن هنا لمساعدتك على مدار الساعة." />
        <Accordion items={ITEMS} />
      </main>
    </div>
  ),
});
