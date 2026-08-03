import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Newspaper } from "lucide-react";

export const Route = createFileRoute("/media-kit")({
  head: () => ({
    meta: [
      { title: "الحزمة الإعلامية | IDEA BUSINESS" },
      { name: "description", content: "شعارات وصور وألوان IDEA BUSINESS للاستخدام الإعلامي." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Newspaper className="h-6 w-6" />} title="الحزمة الإعلامية" subtitle="موارد العلامة التجارية للصحفيين والشركاء." />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { t: "الشعارات (SVG, PNG)", href: "mailto:press@busniss.org?subject=طلب%20الشعارات" },
            { t: "لوحة الألوان الرسمية", href: "mailto:press@busniss.org?subject=طلب%20لوحة%20الألوان" },
            { t: "صور المؤسسين", href: "mailto:press@busniss.org?subject=طلب%20صور%20المؤسسين" },
            { t: "بيانات صحفية", href: "mailto:press@busniss.org?subject=طلب%20بيانات%20صحفية" },
          ].map(({ t, href }) => (
            <a key={t} href={href} className="rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/40">
              <h3 className="font-bold">{t}</h3>
              <p className="mt-1 text-xs text-muted-foreground">اطلب عبر البريد</p>
            </a>
          ))}
        </div>
      </main>
    </div>
  ),
});
