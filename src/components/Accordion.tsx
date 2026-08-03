import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-card/60">
      {items.map((it, i) => (
        <details key={i} open={open === i} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && setOpen(i)} className="group">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
            {it.q}
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 text-sm text-muted-foreground">{it.a}</div>
        </details>
      ))}
    </div>
  );
}
