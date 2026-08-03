import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Calendar, MapPin } from "lucide-react";

const EVENTS = [
  { d: "2026-07-05", t: "يوم المستثمر — الرياض", l: "الرياض، فندق الفيصلية" },
  { d: "2026-07-18", t: "ندوة افتراضية: تقييم المشاريع الناشئة", l: "أونلاين" },
  { d: "2026-08-02", t: "ملتقى رواد الأعمال — دبي", l: "دبي، DIFC" },
];

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [
    { title: "الفعاليات | IDEA BUSINESS" },
    { name: "description", content: "ندوات، ملتقيات، وأيام مستثمر — كل فعاليات IDEA BUSINESS." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Calendar className="h-6 w-6" />} title="الفعاليات" subtitle="انضم إلى مجتمعنا." />
        <ul className="space-y-3">
          {EVENTS.map((e) => (
            <li key={e.t} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
              <div>
                <h3 className="text-base font-black">{e.t}</h3>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {e.l}</div>
              </div>
              <div className="rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-extrabold text-primary">{new Date(e.d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  ),
});
