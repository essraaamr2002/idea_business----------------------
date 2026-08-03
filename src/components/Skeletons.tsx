export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}
export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <SkeletonLine className="h-32 w-full" />
      <SkeletonLine className="h-4 w-3/4" />
      <SkeletonLine className="h-3 w-1/2" />
      <div className="flex gap-2"><SkeletonLine className="h-3 w-16" /><SkeletonLine className="h-3 w-20" /></div>
    </div>
  );
}
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
