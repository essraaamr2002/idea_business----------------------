import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Ctrl / ⌘ + K", desc: "فتح لوحة الأوامر والبحث السريع" },
  { keys: "?", desc: "إظهار اختصارات لوحة المفاتيح" },
  { keys: "G ثم H", desc: "الذهاب إلى الرئيسية" },
  { keys: "G ثم M", desc: "السوق الموازي" },
  { keys: "G ثم N", desc: "الأخبار" },
  { keys: "Esc", desc: "إغلاق الحوارات" },
];

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if (e.key === "?") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold"><Keyboard className="h-4 w-4 text-primary" /> اختصارات لوحة المفاتيح</div>
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <ul className="divide-y divide-border">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between py-2 text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-mono font-bold">{s.keys}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
