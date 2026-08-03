import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Accessibility } from "lucide-react";

export const Route = createFileRoute("/accessibility")({
  head: () => ({ meta: [
    { title: "إمكانية الوصول | IDEA BUSINESS" },
    { name: "description", content: "التزامنا بجعل المنصة متاحة للجميع وفق معايير WCAG 2.1." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Accessibility className="h-6 w-6" />} title="إمكانية الوصول" subtitle="منصة متاحة للجميع." />
        <div className="space-y-3 text-sm leading-7">
          <p>نسعى لتوفير تجربة شاملة وفق معايير WCAG 2.1 AA: تباين كافٍ، تنقّل بلوحة المفاتيح، نصوص بديلة للصور، ودعم كامل للقارئات الصوتية.</p>
          <p>للإبلاغ عن مشكلة وصول، راسلنا على <a href="mailto:access@busniss.org" className="font-extrabold text-primary hover:underline">access@busniss.org</a>.</p>
        </div>
      </main>
    </div>
  ),
});
