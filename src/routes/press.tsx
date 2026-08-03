import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "الإعلام والشراكات | IDEA BUSINESS" },
      { name: "description", content: "حزمة إعلامية، شعارات، وروابط للصحافة والشراكات." },
      { property: "og:title", content: "الإعلام والشراكات — IDEA BUSINESS" },
    ],
  }),
  component: PressPage,
});

function PressPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<Newspaper className="h-6 w-6" />} title="الإعلام والشراكات" subtitle="موارد للصحفيين والشركاء." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card/60 p-5">
            <h3 className="text-lg font-black">الحزمة الإعلامية</h3>
            <p className="mt-1 text-sm text-muted-foreground">شعارات، صور، وملف تعريفي رسمي.</p>
            <a href="/og-logo.png" download className="mt-3 inline-block text-sm font-extrabold text-primary hover:underline">تحميل الشعار ←</a>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-5">
            <h3 className="text-lg font-black">تواصل الصحافة</h3>
            <p className="mt-1 text-sm text-muted-foreground">للاستفسارات الإعلامية والشراكات.</p>
            <a href="mailto:press@busniss.org" className="mt-3 inline-block text-sm font-extrabold text-primary hover:underline">press@busniss.org</a>
          </div>
        </div>
      </main>
    </div>
  );
}
