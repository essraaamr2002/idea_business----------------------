import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tag } from "@/components/Tag";
import { GitBranch } from "lucide-react";

const FLAGS = [
  { name: "AI Recommendations v2", status: "beta", desc: "محرّك توصيات جديد بمعدل دقة أعلى." },
  { name: "Voice Commands", status: "alpha", desc: "تنفيذ أوامر بالصوت داخل المنصة." },
  { name: "Live Charts", status: "stable", desc: "رسوم بيانية حية لكل مشروع." },
];

export const Route = createFileRoute("/labs")({
  head: () => ({
    meta: [
      { title: "المختبرات | IDEA BUSINESS" },
      { name: "description", content: "جرّب ميزات تجريبية قبل إطلاقها الرسمي." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<GitBranch className="h-6 w-6" />} title="المختبرات" subtitle="جرّب الميزات قبل أن تصبح رسمية." />
        <div className="space-y-3">
          {FLAGS.map((f) => (
            <div key={f.name} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-bold">{f.name}</h3>
                  <Tag tone={f.status === "stable" ? "success" : f.status === "beta" ? "info" : "warning"}>{f.status}</Tag>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
                <span className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition" />
              </label>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
});
