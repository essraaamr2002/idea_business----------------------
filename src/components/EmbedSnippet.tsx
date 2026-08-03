import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function EmbedSnippet({ code, label = "كود التضمين" }: { code: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1500); }}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {done ? "تم النسخ" : "نسخ"}
        </button>
      </div>
      <pre dir="ltr" className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}
