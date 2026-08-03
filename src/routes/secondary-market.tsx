import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import {
  listOpenSecondaryListings,
  createSecondaryListing,
  cancelSecondaryListing,
  expressInterestSecondary,
} from "@/lib/secondary-market.functions";
import { useAuth } from "@/hooks/useAuth";
import { Repeat2, X, Handshake, Plus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/secondary-market")({
  head: () => ({
    meta: [
      { title: "السوق الثانوي — IDEA BUSINESS" },
      { name: "description", content: "تداول حصص المشاريع بين الأعضاء بشفافية وعبر ضمانات المنصة." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-destructive">تعذر تحميل السوق الثانوي. {String(error?.message ?? "")}</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">الصفحة غير موجودة</div>,
  component: SecondaryMarketPage,
});

function SecondaryMarketPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listOpenSecondaryListings);
  const create = useServerFn(createSecondaryListing);
  const cancel = useServerFn(cancelSecondaryListing);
  const interest = useServerFn(expressInterestSecondary);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["secondary-market"],
    queryFn: () => list(),
  });

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10">
        <PageHeader
          kicker="تداول حصص بين الأعضاء"
          title="السوق الثانوي"
          subtitle="اعرض حصصك للبيع أو ابحث عن فرص استحواذ. كل صفقة تمر عبر ضمانات المنصة."
          icon={<Repeat2 className="h-3 w-3" />}
        />

        {user && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setShowForm((s) => !s)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              {showForm ? "إغلاق" : "أنشئ عرضاً"}
            </button>
          </div>
        )}

        {showForm && user && (
          <CreateForm
            onSubmit={async (payload) => {
              try {
                await create({ data: payload });
                toast.success("تم نشر عرضك");
                setShowForm(false);
                qc.invalidateQueries({ queryKey: ["secondary-market"] });
              } catch (e: any) { toast.error(e?.message || "تعذر النشر"); }
            }}
          />
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card p-2">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">جاري التحميل…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">لا توجد عروض مفتوحة حالياً.</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it: any) => {
                const mine = user?.id === it.seller_id;
                const busy = busyId === it.id;
                return (
                  <li key={it.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-bold">
                        {it.offer_type === "buy" ? "طلب شراء" : "عرض بيع"} · {it.shares} حصة
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        السعر المطلوب: <span className="font-bold text-foreground">{Number(it.ask_price).toLocaleString("ar")}</span> ر.س
                      </div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(it.created_at).toLocaleDateString("ar")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mine ? (
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setBusyId(it.id);
                            try {
                              await cancel({ data: { id: it.id } });
                              toast.success("تم إلغاء العرض");
                              qc.invalidateQueries({ queryKey: ["secondary-market"] });
                            } catch (e: any) { toast.error(e?.message); } finally { setBusyId(null); }
                          }}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-bold text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} إلغاء
                        </button>
                      ) : user ? (
                        <button
                          disabled={busy}
                          onClick={async () => {
                            setBusyId(it.id);
                            try {
                              await interest({ data: { id: it.id } });
                              toast.success("تم إرسال اهتمامك للبائع");
                            } catch (e: any) { toast.error(e?.message); } finally { setBusyId(null); }
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Handshake className="h-3 w-3" />} مهتم
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function CreateForm({ onSubmit }: { onSubmit: (p: { projectId: string; shares: number; askPrice: number; offerType: "sell" | "buy" }) => Promise<void> }) {
  const [projectId, setProjectId] = useState("");
  const [shares, setShares] = useState("");
  const [askPrice, setAskPrice] = useState("");
  const [offerType, setOfferType] = useState<"sell" | "buy">("sell");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mt-4 rounded-2xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit({ projectId, shares: Number(shares), askPrice: Number(askPrice), offerType });
          setProjectId(""); setShares(""); setAskPrice("");
        } finally { setBusy(false); }
      }}
    >
      <label className="text-xs font-bold sm:col-span-2">
        معرّف المشروع (UUID)
        <input required value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs" placeholder="00000000-0000-0000-0000-000000000000" />
      </label>
      <label className="text-xs font-bold">
        عدد الحصص
        <input required type="number" min={1} value={shares} onChange={(e) => setShares(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>
      <label className="text-xs font-bold">
        السعر المطلوب (ر.س)
        <input required type="number" min={1} step="0.01" value={askPrice} onChange={(e) => setAskPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>
      <label className="text-xs font-bold sm:col-span-2">
        نوع العرض
        <select value={offerType} onChange={(e) => setOfferType(e.target.value as any)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2">
          <option value="sell">عرض بيع</option>
          <option value="buy">طلب شراء</option>
        </select>
      </label>
      <button disabled={busy} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} نشر العرض
      </button>
    </form>
  );
}
