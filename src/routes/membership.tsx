import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMembershipStatus,
  subscribeMembershipTier,
  createMembershipPaymentIntent,
  listMembershipPlans,
} from "@/lib/membership.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Wallet, Shield, Zap, Award, Infinity as Inf } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/membership")({
  component: MembershipPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">{(error as Error).message}</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">غير موجود</div>,
});

const TIER_META: Record<string, { icon: any; ring: string; pill: string }> = {
  basic: { icon: Shield, ring: "border-border", pill: "bg-muted text-foreground" },
  silver: { icon: Award, ring: "border-slate-400/40", pill: "bg-slate-300 text-slate-900" },
  gold: { icon: Sparkles, ring: "border-primary/50", pill: "bg-primary text-primary-foreground" },
  platinum: { icon: Crown, ring: "border-amber-400/50", pill: "bg-amber-400 text-amber-950" },
};

const TIER_LABELS: Record<string, string> = {
  basic: "الباقة المجانية",
  silver: "الباقة الفضية",
  gold: "الباقة الذهبية",
  platinum: "الباقة البلاتينية",
};

function fmtCap(n: number) {
  return n < 0 ? "غير محدود" : Number(n).toLocaleString("ar");
}

function MembershipPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const getStatus = useServerFn(getMembershipStatus);
  const listPlans = useServerFn(listMembershipPlans);
  const subscribe = useServerFn(subscribeMembershipTier);
  const createIntent = useServerFn(createMembershipPaymentIntent);

  const [status, setStatus] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const accessToken = session?.access_token;

  const refresh = useCallback(
    () =>
      Promise.all([
        accessToken
          ? getStatus({ headers: { Authorization: `Bearer ${accessToken}` } })
              .then(setStatus)
              .catch(() => setStatus(null))
          : Promise.resolve(setStatus(null)),
        listPlans()
          .then((p: any) => setPlans(p ?? []))
          .catch(() => setPlans([])),
      ]),
    [accessToken, getStatus, listPlans],
  );

  useEffect(() => {
    refresh();
  }, [authLoading, refresh]);

  const currentTier = status?.tier ?? "basic";
  const exp = status?.expires_at ? new Date(status.expires_at).toLocaleDateString("ar") : null;

  const handleSubscribe = async (tier: "silver" | "gold" | "platinum") => {
    if (!session?.access_token) {
      toast.info("سجّل الدخول أولاً للاشتراك في إحدى الباقات");
      await navigate({ to: "/auth" });
      return;
    }

    const headers = { Authorization: `Bearer ${session.access_token}` };
    setLoading(tier);
    try {
      const res: any = await subscribe({ data: { tier }, headers });
      if (res?.ok) {
        toast.success(
          `تم تفعيل العضوية، سارية حتى ${new Date(res.expires_at).toLocaleDateString("ar")}`,
        );
        refresh();
      } else if (res?.reason === "insufficient") {
        const intent: any = await createIntent({ data: { tier }, headers });
        if (intent?.checkoutUrl) {
          window.location.href = intent.checkoutUrl;
        } else {
          toast.error(`الرصيد غير كاف (${res.balance} من ${res.needed} ر.س). شحن المحفظة مطلوب.`);
        }
      } else {
        toast.error("تعذر إتمام الاشتراك");
      }
    } catch (e: any) {
      const message = String(e?.message ?? "");
      if (/missing supabase environment|service_role|environment variable/i.test(message)) {
        console.error("[membership] Server configuration is incomplete", e);
        toast.error("خدمة الاشتراك غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.");
      } else {
        toast.error(message || "تعذر إتمام الاشتراك");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold sm:text-3xl">باقات العضوية</h1>
        <p className="mt-2 text-muted-foreground">
          أربع باقات بصلاحيات مختلفة، كل باقة بسقف صارم لا يمكن تجاوزه.
        </p>
      </div>

      {currentTier !== "basic" && exp && (
        <Card className="border-emerald-500/40 bg-emerald-500/10 p-4 text-center">
          <Crown className="mx-auto h-6 w-6 text-emerald-600" />
          <p className="mt-1 font-bold text-emerald-700">
            باقتك الحالية:{" "}
            {TIER_LABELS[currentTier] ??
              plans.find((p) => p.tier === currentTier)?.name_ar ??
              currentTier}
            ، سارية حتى {exp}
          </p>
        </Card>
      )}

      {!authLoading && session && !status && (
        <div className="text-center text-muted-foreground">جار تحميل بيانات عضويتك...</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const meta = TIER_META[p.tier] ?? TIER_META.basic;
          const Icon = meta.icon;
          const isCurrent = currentTier === p.tier;
          const isFree = p.price_sar <= 0;
          const usage = status?.usage ?? {};

          return (
            <Card
              key={p.tier}
              className={`relative min-w-0 space-y-3 border-2 ${meta.ring} p-4 sm:p-6`}
            >
              {p.tier === "gold" && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground">
                  الأكثر اختيارا
                </span>
              )}

              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold">
                  <Icon className="h-5 w-5" /> {TIER_LABELS[p.tier] ?? p.name_ar}
                </h2>
                {isCurrent && <Badge variant="secondary">حالية</Badge>}
              </div>

              <p className="text-3xl font-extrabold tabular-nums">
                {isFree ? (
                  "مجاني"
                ) : (
                  <>
                    {Number(p.price_sar).toLocaleString("ar")}{" "}
                    <span className="text-xs font-normal text-muted-foreground">ر.س / شهر</span>
                  </>
                )}
              </p>

              <ul className="space-y-1.5 text-xs">
                <Feature label={`Projects: ${fmtCap(p.projects_cap)}`} unl={p.projects_cap < 0} />
                <Feature label={`إعجابات: ${fmtCap(p.likes_cap)}`} unl={p.likes_cap < 0} />
                <Feature label={`تعليقات: ${fmtCap(p.comments_cap)}`} unl={p.comments_cap < 0} />
                <Feature label={`تفاعلات أخرى: ${fmtCap(p.other_cap)}`} unl={p.other_cap < 0} />
                {p.verified_badge && <Feature label="علامة تحقق زرقاء بجوار اسمك" />}
                {p.priority_support && <Feature label="أولوية في الدعم" />}
                {p.ai_advanced && <Feature label="مساعد AI متقدم" />}
                {p.dedicated_manager && <Feature label="مدير حساب مخصص" />}
              </ul>

              {isCurrent && (
                <div className="rounded-lg bg-muted/50 p-2 text-[11px]">
                  استهلاكك هذا الشهر:
                  <div className="mt-1 grid grid-cols-1 gap-1 tabular-nums min-[380px]:grid-cols-2">
                    <span>
                      Projects {usage.projects}/{fmtCap(p.projects_cap)}
                    </span>
                    <span>
                      إعجابات {usage.likes}/{fmtCap(p.likes_cap)}
                    </span>
                    <span>
                      تعليقات {usage.comments}/{fmtCap(p.comments_cap)}
                    </span>
                    <span>
                      أخرى {usage.other}/{fmtCap(p.other_cap)}
                    </span>
                  </div>
                </div>
              )}

              {isFree ? (
                <Button variant="outline" disabled className="w-full">
                  الباقة الافتراضية
                </Button>
              ) : (
                <Button
                  onClick={() => handleSubscribe(p.tier as any)}
                  disabled={!!loading || isCurrent}
                  className="w-full"
                >
                  {isCurrent
                    ? "مفعلة"
                    : loading === p.tier
                      ? "جار المعالجة..."
                      : currentTier === "basic"
                        ? session
                          ? "اشترك"
                          : "سجّل الدخول للاشتراك"
                        : "ترقية"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {status && (
        <Card className="p-4 text-xs text-muted-foreground">
          <p className="flex flex-wrap items-center gap-1 leading-relaxed">
            <Wallet className="h-3.5 w-3.5" />
            رصيد المحفظة:{" "}
            <span className="font-bold text-foreground tabular-nums">
              {status.wallet_balance} {status.wallet_currency}
            </span>
            ، عند نقص الرصيد سيتم توجيهك لبوابة الدفع.
            <Link to="/wallet" className="text-primary underline">
              شحن المحفظة
            </Link>
          </p>
        </Card>
      )}

      <Card className="p-4 text-sm text-muted-foreground">
        <p className="font-bold text-foreground flex items-center gap-1">
          <Zap className="h-4 w-4" /> كيف يعمل التجديد التلقائي؟
        </p>
        <p className="mt-1">
          يتم خصم رسوم الباقة تلقائيا من محفظتك يوم انتهاء العضوية. عند نقص الرصيد تعود عضويتك للوضع
          المجاني وسنرسل تنبيها بالبريد.
        </p>
      </Card>
    </div>
  );
}

function Feature({ label, unl }: { label: string; unl?: boolean }) {
  return (
    <li className="flex min-w-0 items-start gap-2">
      {unl ? (
        <Inf className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Check className="h-3.5 w-3.5 text-primary" />
      )}
      <span className="min-w-0 break-words">{label}</span>
    </li>
  );
}
