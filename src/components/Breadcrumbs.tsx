import { Link } from "@tanstack/react-router";
import { ChevronLeft, Home } from "lucide-react";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="مسار التنقّل" className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/" className="inline-flex items-center gap-1 hover:text-primary"><Home className="h-3 w-3" /> الرئيسية</Link>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronLeft className="h-3 w-3" />
          {it.to ? <Link to={it.to} className="hover:text-primary">{it.label}</Link> : <span className="text-foreground">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
