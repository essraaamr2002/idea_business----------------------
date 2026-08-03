import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Cookie } from "lucide-react";
import { toast } from "sonner";

type Prefs = { essential: true; analytics: boolean; marketing: boolean };
const KEY = "fb_cookie_prefs_v1";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [
    { title: "تفضيلات الكوكيز | IDEA BUSINESS" },
    { name: "description", content: "تحكّم بنوع الكوكيز التي تسمح بها." },
  ]}),
  component: () => {
    const [p, setP] = useState<Prefs>({ essential: true, analytics: true, marketing: false });
    useEffect(() => { try { const s = localStorage.getItem(KEY); if (s) setP({ ...p, ...JSON.parse(s) }); } catch {} }, []);
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} toast.success("تم حفظ تفضيلاتك"); };
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-2xl px-4 py-10">
          <PageHeader icon={<Cookie className="h-6 w-6" />} title="تفضيلات الكوكيز" subtitle="أنت تتحكم بما يُخزَّن على جهازك." />
          <div className="space-y-3">
            {[
              { k: "essential", t: "أساسية", d: "ضرورية لعمل المنصة (إلزامية).", disabled: true },
              { k: "analytics", t: "تحليلات", d: "تساعدنا على فهم الاستخدام وتحسينه." },
              { k: "marketing", t: "تسويق", d: "تُمكِّن تجارب تسويقية مخصّصة." },
            ].map((it) => (
              <label key={it.k} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
                <div>
                  <div className="text-sm font-extrabold">{it.t}</div>
                  <div className="text-xs text-muted-foreground">{it.d}</div>
                </div>
                <input type="checkbox" disabled={it.disabled} checked={(p as any)[it.k]} onChange={(e) => setP({ ...p, [it.k]: e.target.checked } as Prefs)} className="h-5 w-5 accent-primary" />
              </label>
            ))}
            <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">حفظ التفضيلات</button>
          </div>
        </main>
      </div>
    );
  },
});
