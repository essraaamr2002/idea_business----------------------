import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Briefcase, MapPin } from "lucide-react";

const JOBS = [
  { t: "مهندس Frontend أول", l: "عن بُعد", d: "React/TanStack — بناء تجارب استثمارية." },
  { t: "مصمم منتج (Senior)", l: "الرياض/عن بُعد", d: "تصميم تجارب مالية معقدة بوضوح." },
  { t: "مسؤول نمو (Growth)", l: "عن بُعد", d: "قنوات نمو، إعلانات، شراكات." },
];

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [
    { title: "الوظائف | IDEA BUSINESS" },
    { name: "description", content: "انضم لفريق IDEA BUSINESS وساعدنا في بناء مستقبل الاستثمار في العالم العربي." },
    { property: "og:title", content: "وظائف IDEA BUSINESS" },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Briefcase className="h-6 w-6" />} title="الوظائف" subtitle="ابنِ المستقبل معنا." />
        <ul className="space-y-3">
          {JOBS.map((j) => (
            <li key={j.t} className="rounded-2xl border border-border bg-card/60 p-5">
              <h3 className="text-lg font-black">{j.t}</h3>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {j.l}</div>
              <p className="mt-2 text-sm text-muted-foreground">{j.d}</p>
              <a href="mailto:careers@busniss.org" className="mt-3 inline-block text-sm font-extrabold text-primary hover:underline">قدّم الآن ←</a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
