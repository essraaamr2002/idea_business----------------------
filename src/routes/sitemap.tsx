import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Map } from "lucide-react";

export const Route = createFileRoute("/sitemap")({
  head: () => ({
    meta: [
      { title: "خريطة الموقع | IDEA BUSINESS" },
      { name: "description", content: "جميع صفحات منصة IDEA BUSINESS في مكان واحد." },
      { property: "og:title", content: "خريطة الموقع — IDEA BUSINESS" },
    ],
  }),
  component: SitemapPage,
});

const GROUPS: { t: string; links: { to: string; l: string }[] }[] = [
  { t: "عام", links: [
    { to: "/", l: "الرئيسية" },
    { to: "/about", l: "من نحن" },
    { to: "/how-it-works", l: "كيف تعمل المنصة" },
    { to: "/contact", l: "تواصل معنا" },
    { to: "/faq", l: "الأسئلة الشائعة" },
  ]},
  { t: "للمستخدمين", links: [
    { to: "/for-investors", l: "للمستثمرين" },
    { to: "/for-founders", l: "لرواد الأعمال" },
    { to: "/projects/new", l: "اطرح فكرة" },
    { to: "/market", l: "السوق الموازي" },
    { to: "/news", l: "الأخبار" },
    { to: "/disputes", l: "المنازعات" },
    { to: "/ads", l: "الإعلانات" },
  ]},
  { t: "حسابي", links: [
    { to: "/wallet", l: "المحفظة" },
    { to: "/dashboard", l: "لوحة التحكم" },
    { to: "/messages", l: "الرسائل" },
    { to: "/watchlist", l: "قائمة المتابعة" },
    { to: "/referrals", l: "الإحالات" },
    { to: "/membership", l: "العضوية" },
  ]},
  { t: "الموارد", links: [
    { to: "/glossary", l: "المسرد" },
    { to: "/roadmap", l: "خارطة الطريق" },
    { to: "/changelog", l: "سجل التحديثات" },
    { to: "/status", l: "حالة الخدمة" },
    { to: "/press", l: "الإعلام" },
    { to: "/privacy", l: "الخصوصية" },
    { to: "/terms", l: "الشروط" },
  ]},
];

function SitemapPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<Map className="h-6 w-6" />} title="خريطة الموقع" subtitle="كل الصفحات في مكان واحد." />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g) => (
            <div key={g.t} className="rounded-2xl border border-border bg-card/60 p-5">
              <h3 className="mb-2 text-sm font-black text-primary">{g.t}</h3>
              <ul className="space-y-1.5 text-sm">
                {g.links.map((l) => (
                  <li key={l.to}><Link to={l.to} className="hover:text-primary">{l.l}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
