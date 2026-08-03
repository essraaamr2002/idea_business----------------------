import { ReactNode } from "react";

export function Timeline({ items }: { items: { date: string; title: string; desc?: string; icon?: ReactNode }[] }) {
  return (
    <ol className="relative border-s-2 border-primary/20 ps-6">
      {items.map((it, i) => (
        <li key={i} className="mb-6">
          <span className="absolute -start-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background">
            {it.icon}
          </span>
          <time className="text-xs font-medium text-muted-foreground">{it.date}</time>
          <h3 className="mt-1 font-bold">{it.title}</h3>
          {it.desc && <p className="mt-1 text-sm text-muted-foreground">{it.desc}</p>}
        </li>
      ))}
    </ol>
  );
}
