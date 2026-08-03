import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Trophy, Medal } from "lucide-react";

const TOP = [
  { r: 1, n: "أبو_الفوارس", v: "+ 248,500" },
  { r: 2, n: "سارة_الاستثمار", v: "+ 198,000" },
  { r: 3, n: "Khalid.M", v: "+ 154,300" },
  { r: 4, n: "Founder_X", v: "+ 121,750" },
  { r: 5, n: "نوال_VC", v: "+ 98,200" },
];

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [
    { title: "لوحة المتصدّرين | IDEA BUSINESS" },
    { name: "description", content: "أعلى المستثمرين أداءً هذا الشهر." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Trophy className="h-6 w-6" />} title="لوحة المتصدّرين" subtitle="أعلى المستثمرين هذا الشهر." />
        <ol className="overflow-hidden rounded-2xl border border-border bg-card/60">
          {TOP.map((u) => (
            <li key={u.r} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${u.r === 1 ? "bg-amber-400 text-black" : u.r === 2 ? "bg-zinc-300 text-black" : u.r === 3 ? "bg-amber-700 text-white" : "bg-muted text-foreground"}`}>{u.r}</span>
                <span className="font-bold">@{u.n}</span>
                {u.r === 1 ? <Medal className="h-4 w-4 text-amber-400" /> : null}
              </div>
              <span className="font-mono text-sm font-extrabold text-emerald-500">{u.v} ر.س</span>
            </li>
          ))}
        </ol>
      </main>
    </div>
  ),
});
