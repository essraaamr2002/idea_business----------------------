import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Map } from "lucide-react";

const SECTIONS: { title: string; links: { to: string; label: string }[] }[] = [
  { title: "المنصة", links: [
    { to: "/", label: "الرئيسية" }, { to: "/projects", label: "المشاريع" }, { to: "/market", label: "السوق" }, { to: "/news", label: "الأخبار" }, { to: "/community", label: "المجتمع" },
  ]},
  { title: "الأدوات", links: [
    { to: "/calculators", label: "الحاسبات" }, { to: "/zakat", label: "الزكاة" }, { to: "/goals", label: "الأهداف" }, { to: "/portfolio", label: "المحفظة" }, { to: "/alerts", label: "التنبيهات" },
  ]},
  { title: "المعرفة", links: [
    { to: "/education", label: "التعلم" }, { to: "/blog", label: "المدونة" }, { to: "/case-studies", label: "دراسات الحالة" }, { to: "/glossary", label: "المسرد" }, { to: "/tips", label: "نصائح" },
  ]},
  { title: "الشركة", links: [
    { to: "/about", label: "عنّا" }, { to: "/our-story", label: "قصتنا" }, { to: "/team", label: "الفريق" }, { to: "/careers", label: "الوظائف" }, { to: "/contact", label: "تواصل" },
  ]},
];

export const Route = createFileRoute("/all-pages")({
  head: () => ({
    meta: [
      { title: "كل الصفحات | IDEA BUSINESS" },
      { name: "description", content: "فهرس كامل لصفحات وأقسام منصة IDEA BUSINESS." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Map className="h-6 w-6" />} title="فهرس كامل" subtitle="استكشف جميع أقسام المنصة." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className="mb-2 font-bold">{s.title}</h3>
              <ul className="space-y-1 text-sm">
                {s.links.map((l) => (
                  <li key={l.to}><Link to={l.to} className="text-muted-foreground hover:text-primary">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
