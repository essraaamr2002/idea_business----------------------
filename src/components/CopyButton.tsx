import { useState } from "react";

export function CopyButton({ text, label = "نسخ" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
    >
      {done ? "تم النسخ ✓" : label}
    </button>
  );
}
