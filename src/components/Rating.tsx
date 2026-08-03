import { Star } from "lucide-react";

export function Rating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${value}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
}
