import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/regulations")({
  head: () => ({
    meta: [
      { title: "اللوائح والتراخيص | IDEA BUSINESS" },
      { name: "description", content: "تراخيصنا التنظيمية والتزامنا بالأنظمة." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="اللوائح والامتثال" subtitle="نعمل وفق الأنظمة السعودية والممارسات الدولية." />
        <div className="space-y-3">
          {[
            { t: "هيئة السوق المالية", d: "ترخيص رقم 12345-AB لمزاولة نشاط التمويل الجماعي." },
            { t: "البنك المركزي السعودي (ساما)", d: "اعتماد خدمات المدفوعات الإلكترونية." },
            { t: "حماية البيانات الشخصية (PDPL)", d: "امتثال كامل لنظام حماية البيانات السعودي." },
            { t: "ISO 27001", d: "شهادة معتمدة لأمن المعلومات." },
          ].map((c, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card/60 p-4">
              <h3 className="font-bold">{c.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
