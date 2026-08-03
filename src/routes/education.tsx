import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { BookOpen, Play, Award } from "lucide-react";

const COURSES = [
  { slug: "basics", title: "أساسيات الاستثمار", lessons: 8, level: "مبتدئ", icon: BookOpen },
  { slug: "crowdfunding", title: "التمويل الجماعي خطوة بخطوة", lessons: 12, level: "متوسط", icon: Play },
  { slug: "risk", title: "إدارة المخاطر المالية", lessons: 6, level: "متقدم", icon: Award },
];

export const Route = createFileRoute("/education")({
  head: () => ({
    meta: [
      { title: "مركز التعلم | IDEA BUSINESS" },
      { name: "description", content: "دورات ومقالات تعليمية لرفع وعيك الاستثماري." },
      { property: "og:title", content: "مركز التعلم — IDEA BUSINESS" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader icon={<BookOpen className="h-6 w-6" />} title="مركز التعلم" subtitle="ارتقِ بمهاراتك المالية والاستثمارية." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c) => (
            <Link key={c.slug} to="/education" className="group rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/40 hover:bg-card">
              <c.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-bold">{c.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{c.lessons} دروس · {c.level}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  ),
});
