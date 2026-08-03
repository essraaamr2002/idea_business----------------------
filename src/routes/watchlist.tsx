import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { listWatchlist, removeWatchlist } from "@/lib/watchlist.functions";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, Eye, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "قائمة المتابعة — IDEA BUSINESS" },
      { name: "description", content: "تابع مشاريعك المفضلة واستلم تنبيهات ذكية عند تغير حالتها." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const list = useServerFn(listWatchlist);
  const remove = useServerFn(removeWatchlist);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: () => list(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">سجّل الدخول لعرض قائمتك</h1>
          <button onClick={() => router.navigate({ to: "/auth" })} className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          kicker="تنبيهات ذكية مفعّلة"
          title="قائمة المتابعة"
          subtitle="المشاريع التي تريد متابعة تغيراتها لحظة بلحظة."
          icon={<Bell className="h-3 w-3" />}
        />


        <div className="mt-8 rounded-2xl border border-border bg-card p-2">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <Eye className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">لم تضف أي مشاريع بعد.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((w: any) => (
                <li key={w.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{w.projects?.name ?? "—"}</div>
                    {w.note && <div className="mt-0.5 truncate text-xs text-muted-foreground">{w.note}</div>}
                    <div className="mt-1 text-[10px] text-muted-foreground">أضيف {new Date(w.created_at).toLocaleDateString("ar")}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await remove({ data: { id: w.id } });
                      qc.invalidateQueries({ queryKey: ["watchlist"] });
                      toast.success("تمت الإزالة");
                    }}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
