import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { FAQAccordion, FAQ_DATA } from "@/components/FAQAccordion";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "الأسئلة الشائعة | IDEA BUSINESS" },
      { name: "description", content: "إجابات على أكثر الأسئلة شيوعاً حول الاستثمار، إطلاق المشاريع، الضمانات، المحفظة، والمنازعات على منصة IDEA BUSINESS." },
      { property: "og:title", content: "الأسئلة الشائعة — IDEA BUSINESS" },
      { property: "og:description", content: "كل ما تحتاج معرفته للبدء كمستثمر أو صاحب مشروع." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ_DATA.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FAQPage,
});

function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          icon={<HelpCircle className="h-6 w-6" />}
          title="الأسئلة الشائعة"
          subtitle="إجابات سريعة لأكثر الأسئلة طرحاً. لم تجد ما تبحث عنه؟ تواصل مع الدعم."
        />
        <FAQAccordion />
        <div className="mt-8 rounded-2xl border border-border bg-card/60 p-6 text-center backdrop-blur">
          <h2 className="text-lg font-black">ما زال لديك سؤال؟</h2>
          <p className="mt-1 text-sm text-muted-foreground">فريق الدعم متاح للإجابة على استفساراتك خلال ساعات.</p>
          <Link to="/support" className="mt-3 inline-block text-sm font-extrabold text-primary hover:underline">
            تواصل مع الدعم ←
          </Link>
        </div>
      </main>
    </div>
  );
}
