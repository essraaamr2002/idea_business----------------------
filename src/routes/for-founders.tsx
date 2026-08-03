import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/for-founders")({
  head: () => ({
    meta: [
      { title: "لرواد الأعمال | IDEA BUSINESS" },
      { name: "description", content: "اطرح فكرتك، احصل على التمويل من مجتمع من المستثمرين الموثّقين عبر ضمانات قانونية." },
      { property: "og:title", content: "لرواد الأعمال — IDEA BUSINESS" },
    ],
  }),
  component: FoundersPage,
});

function FoundersPage() {
  const steps = ["جهّز ملف المشروع", "اطلب التحقق", "أطلق حملة التمويل", "تابع المستثمرين"];
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Rocket className="h-6 w-6" />} title="لرواد الأعمال" subtitle="حوّل فكرتك إلى مشروع ممول." />
        <ol className="grid gap-3 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s} className="rounded-2xl border border-border bg-card/60 p-4 text-center">
              <div className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{i + 1}</div>
              <p className="mt-2 text-sm font-bold">{s}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 text-center">
          <Link to="/projects/new" search={{ edit: undefined }} className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">اطرح فكرتك الآن</Link>
        </div>
      </main>
    </div>
  );
}
