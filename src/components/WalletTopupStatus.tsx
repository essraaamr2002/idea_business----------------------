import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Check, Clock, CreditCard, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Intent = {
  id: string;
  status: string;
  amount_minor: number;
  currency: string;
  created_at: string;
  updated_at?: string | null;
};

const STAGES: Array<{ key: string; label: string; match: (s: string) => boolean }> = [
  { key: "initiated", label: "إنشاء طلب الدفع", match: (s) => true },
  { key: "redirect", label: "الانتقال لبوابة الدفع", match: (s) => s !== "initiated" },
  { key: "paid", label: "تأكيد وصول المبلغ", match: (s) => ["paid", "succeeded", "settled", "credited"].includes(s) },
  { key: "credited", label: "ظهور الرصيد في السجل", match: (s) => ["credited", "settled"].includes(s) || s === "succeeded" },
];

/**
 * Shows the live status of the most recent wallet topup payment intent
 * so the user can watch the webhook → ledger pipeline.
 */
export function WalletTopupStatus() {
  const { user } = useAuth();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("payment_intents")
      .select("id, status, amount_minor, currency, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setIntent(data as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`pi-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_intents", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading || !intent) return null;
  const isDone = ["credited", "settled", "succeeded"].includes(intent.status);
  const isFailed = ["failed", "cancelled", "expired"].includes(intent.status);
  // hide finalised intents after 1 hour to avoid clutter
  if (isDone && Date.now() - new Date(intent.updated_at ?? intent.created_at).getTime() > 60 * 60 * 1000) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-extrabold">
              حالة شحن المحفظة — {(intent.amount_minor / 100).toFixed(2)} {intent.currency}
            </div>
            <div className="text-[10px] text-muted-foreground">
              بدأ في {new Date(intent.created_at).toLocaleString("ar-SA")}
            </div>
          </div>
        </div>
        {isFailed
          ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-extrabold text-destructive">فشل الدفع</span>
          : isDone
          ? <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-extrabold text-success">مكتمل</span>
          : <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-extrabold text-warning">قيد المعالجة</span>}
      </div>

      <ol className="space-y-2">
        {STAGES.map((stage, i) => {
          const reached = stage.match(intent.status);
          const isCurrent = !isDone && !isFailed && reached && (i === STAGES.length - 1 || !STAGES[i + 1].match(intent.status));
          return (
            <li key={stage.key} className="flex items-center gap-3 text-xs">
              <span className={`grid h-6 w-6 place-items-center rounded-full ${
                reached ? (isDone || i < STAGES.length - 1 ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground") : "bg-muted text-muted-foreground"
              }`}>
                {isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                  reached ? <Check className="h-3.5 w-3.5" /> :
                  i === 1 ? <CreditCard className="h-3.5 w-3.5" /> :
                  i === 2 ? <ShieldCheck className="h-3.5 w-3.5" /> :
                  <Clock className="h-3.5 w-3.5" />}
              </span>
              <span className={`font-bold ${reached ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</span>
            </li>
          );
        })}
      </ol>

      {isDone && (
        <Link to="/wallet/history" className="mt-3 inline-block text-[11px] font-bold text-primary hover:underline">
          عرض في سجل المحفظة ←
        </Link>
      )}
      {!isDone && !isFailed && (
        <p className="mt-3 text-[10px] text-muted-foreground">
          🔒 الرصيد لا يُضاف إلا بعد تأكيد بوابة الدفع وصول المبلغ لحساب الشركة (Webhook موقّع).
        </p>
      )}
    </div>
  );
}
