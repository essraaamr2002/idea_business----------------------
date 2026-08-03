import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, ShieldCheck, ArrowLeft } from "lucide-react";
import { Money } from "@/components/Money";

const searchSchema = z.object({ projectId: z.string().uuid().optional() });

export const Route = createFileRoute("/checkout")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "إتمام الشراء — IDEA BUSINESS" },
      { name: "description", content: "أكمل عملية شراء حصص المشروع بأمان ومع ضمانات قانونية." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { projectId } = Route.useSearch();
  const { user } = useAuth();
  const router = useRouter();
  const [shares, setShares] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["checkout-project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, ticker, current_price, share_price, shares_total, shares_sold, sector, country, status")
        .eq("id", projectId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  if (!user) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">سجّل الدخول لإتمام الشراء</h1>
        <button onClick={() => router.navigate({ to: "/auth" })} className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">
          تسجيل الدخول
        </button>
      </Shell>
    );
  }

  if (!projectId || (!isLoading && !project)) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">لم يُحدَّد مشروع</h1>
        <Link to="/market" className="mt-6 inline-flex items-center gap-1 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground">
          تصفّح السوق <ArrowLeft className="h-4 w-4" />
        </Link>
      </Shell>
    );
  }

  const price = Number(project?.current_price ?? project?.share_price ?? 0);
  const total = price * shares;
  const max = Math.max(1, Number(project?.shares_total ?? 1) - Number(project?.shares_sold ?? 0));

  const submit = async () => {
    if (!project) return;
    setSubmitting(true);
    const { error } = await supabase.rpc("buy_shares" as any, {
      _project_id: project.id,
      _shares: shares,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("Insufficient")) {
        toast.error("رصيد المحفظة غير كافٍ — يرجى الإيداع أولاً");
        router.navigate({ to: "/wallet" });
      } else if (msg.includes("Not enough shares")) {
        toast.error("الأسهم المتاحة أقل من الكمية المطلوبة");
      } else if (msg.includes("not available")) {
        toast.error("المشروع غير متاح للتداول حاليًا");
      } else {
        toast.error(msg || "تعذّر إتمام الشراء");
      }
      return;
    }
    toast.success("تم تنفيذ الشراء بنجاح — الأسعار والرصيد تحققت على الخادم");
    router.navigate({ to: "/dashboard" });
  };

  return (
    <Shell>
      <PageHeader
        kicker="صفقة بضمانات قانونية"
        title="إتمام الشراء"
        subtitle="تحقق من تفاصيل الصفقة قبل التأكيد — الأموال تُحتجز حتى توثيق العقد."
        icon={<ShieldCheck className="h-3 w-3" />}
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">{project?.ticker} — {project?.sector}</div>
            <h2 className="text-xl font-bold">{project?.name}</h2>
          </div>
          <div className="text-end">
            <Money amount={price} currency="USD" className="text-2xl font-bold" />
            <div className="text-[10px] text-muted-foreground">سعر السهم</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">عدد الأسهم</span>
            <input
              type="number"
              min={1}
              max={max}
              value={shares}
              onChange={(e) => setShares(Math.max(1, Math.min(max, Number(e.target.value) || 1)))}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <span className="mt-1 block text-[10px] text-muted-foreground">المتاح: {max}</span>
          </label>
          <div className="rounded-xl bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">الإجمالي</div>
            <Money amount={total} currency="USD" className="text-2xl font-bold" />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={submitting || isLoading}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          <ShoppingCart className="h-4 w-4" />
          {submitting ? "جاري الإرسال…" : "تأكيد الشراء"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
    </div>
  );
}
