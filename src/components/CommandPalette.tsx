import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";

type Item = { label: string; to: string; hint?: string };

const ITEMS: Item[] = [
  { label: "الرئيسية", to: "/", hint: "Home" },
  { label: "المشاريع", to: "/", hint: "Projects" },
  { label: "السوق الموازي", to: "/market" },
  { label: "الأخبار", to: "/news" },
  { label: "المنازعات", to: "/disputes" },
  { label: "الإعلانات", to: "/ads" },
  { label: "المساعد الذكي", to: "/assistant" },
  { label: "المحفظة", to: "/wallet" },
  { label: "العضوية", to: "/membership" },
  { label: "المجتمع", to: "/community" },
  { label: "الإحالات", to: "/referrals" },
  { label: "الأسئلة الشائعة", to: "/faq" },
  { label: "الدعم", to: "/support" },
  { label: "الملف الشخصي", to: "/profile" },
  { label: "قائمة المتابعة", to: "/watchlist" },
  { label: "الرسائل", to: "/messages" },
  { label: "لوحة التحكم", to: "/dashboard" },
  { label: "إضافة IDEA BUSINESS", to: "/projects/new" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Roadmap", to: "/roadmap" },
  { label: "Changelog", to: "/changelog" },
  { label: "Status", to: "/status" },
  { label: "Glossary", to: "/glossary" },
  { label: "How it works", to: "/how-it-works" },
  { label: "Press", to: "/press" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ITEMS;
    return ITEMS.filter((x) => x.label.toLowerCase().includes(s) || x.hint?.toLowerCase().includes(s));
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 p-4 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setI((p) => Math.min(p + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setI((p) => Math.max(p - 1, 0)); }
              if (e.key === "Enter" && filtered[i]) {
                navigate({ to: filtered[i].to });
                setOpen(false); setQ("");
              }
            }}
            placeholder="ابحث عن صفحة، مشروع، أو إجراء…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <ul className="max-h-80 overflow-auto py-1">
          {filtered.map((it, idx) => (
            <li key={it.to + it.label}>
              <button
                onMouseEnter={() => setI(idx)}
                onClick={() => { navigate({ to: it.to }); setOpen(false); setQ(""); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm ${idx === i ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <span className="font-semibold">{it.label}</span>
                {it.hint ? <span className="text-xs text-muted-foreground">{it.hint}</span> : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد نتائج</li>
          ) : null}
        </ul>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ للتنقل · Enter للفتح · Esc للإغلاق</span>
          <span>Ctrl/⌘ + K</span>
        </div>
      </div>
    </div>
  );
}
