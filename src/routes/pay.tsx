import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { createFatoraPayment } from "@/lib/fatora.functions";
import { BrandedStripeCheckout } from "@/components/BrandedStripeCheckout";
import { CreditCard, Wallet as WalletIcon, ShieldCheck, Lock, ArrowLeft, Loader2 } from "lucide-react";
import logoAsset from "@/assets/idea-business-logo.png.asset.json";
const logoSrc = logoAsset.url;
import { toast } from "sonner";

const search = z.object({
  amount: z.coerce.number().positive().max(1_000_000).optional().default(100),
  currency: z.string().length(3).default("SAR"),
  purpose: z.enum(["wallet_topup", "checkout", "membership", "seriousness_deposit"]).default("wallet_topup"),
  desc: z.string().max(120).optional(),
  returnTo: z.string().max(500).optional(),
});


export const Route = createFileRoute("/pay")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "إتمام الدفع — IDEA BUSINESS" },
      { name: "description", content: "صفحة دفع آمنة وخاصة بمنصة IDEA BUSINESS — Apple Pay، Google Pay، بطاقات ائتمان ومدى." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const params = Route.useSearch();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"card" | "fatora">("card");
  const startFatora = useServerFn(createFatoraPayment);
  const [fatoraBusy, setFatoraBusy] = useState(false);
  const [fatoraUrl, setFatoraUrl] = useState<string | null>(null);

  if (!user) {
    return (
      <Shell>
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-black">سجّل الدخول لإتمام الدفع</h1>
          <button
            onClick={() => router.navigate({ to: "/auth" })}
            className="mt-6 rounded-full bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
          >
            تسجيل الدخول
          </button>
        </div>
      </Shell>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://busniss.org";
  const rt = params.returnTo ? `&returnTo=${encodeURIComponent(params.returnTo)}` : "";
  const returnUrl = `${origin}/payment/success?provider=stripe&purpose=${params.purpose}${rt}`;

  const goFatora = async () => {
    setFatoraBusy(true);
    try {
      const res = await startFatora({
        data: { amount: params.amount, currency: params.currency, purpose: params.purpose },
      });
      if (res.checkoutUrl) {
        setFatoraUrl(res.checkoutUrl);
      } else {
        toast.info(res.message ?? "تم إنشاء طلب الدفع.");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "تعذّر فتح بوابة Fatora.");
    } finally {
      setFatoraBusy(false);
    }
  };

  return (
    <Shell>
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Left: Payment methods */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-primary">دفع آمن</div>
            <h1 className="text-2xl font-black text-foreground">اختر طريقة الدفع</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              جميع المعاملات مشفّرة من طرف إلى طرف. لن نخزّن بيانات بطاقتك على خوادمنا.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1">
            <TabBtn active={tab === "card"} onClick={() => setTab("card")} icon={<CreditCard className="h-4 w-4" />}>
              بطاقة · Apple Pay · Google Pay
            </TabBtn>
            <TabBtn active={tab === "fatora"} onClick={() => setTab("fatora")} icon={<WalletIcon className="h-4 w-4" />}>
              مدى وبطاقات محلية
            </TabBtn>
          </div>

          {tab === "card" ? (
            <BrandedStripeCheckout
              amount={params.amount}
              currency={params.currency}
              purpose={params.purpose}
              returnUrl={returnUrl}
            />
          ) : (
            <div className="space-y-4">
              {fatoraUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-[11px] font-extrabold text-muted-foreground">
                      <Lock className="h-3 w-3 text-success" /> جلسة دفع آمنة داخل المنصة
                    </div>
                    <button
                      onClick={() => setFatoraUrl(null)}
                      className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                    >
                      إلغاء
                    </button>
                  </div>
                  <iframe
                    src={fatoraUrl}
                    title="بوابة الدفع الآمنة"
                    className="block h-[640px] w-full bg-white"
                    allow="payment *"
                  />
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                    سيتم فتح جلسة الدفع الآمنة <span className="font-extrabold text-foreground">داخل صفحة المنصة</span> ببطاقة مدى أو البطاقات المحلية، دون مغادرة الموقع.
                  </div>
                  <button
                    onClick={goFatora}
                    disabled={fatoraBusy}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-95 disabled:opacity-60"
                  >
                    {fatoraBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {fatoraBusy ? "جاري التهيئة…" : "بدء الدفع الآمن"}
                  </button>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-success" /> اتصال مشفّر TLS 1.3 — متوافق مع PCI DSS
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Order summary (branded) */}
        <aside className="rounded-3xl gradient-primary p-6 text-primary-foreground shadow-elevated">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="IDEA BUSINESS" className="h-10 w-10 rounded-xl bg-white/10 p-1" />
            <div>
              <div className="text-[11px] font-extrabold opacity-80">منصة</div>
              <div className="text-base font-black">IDEA BUSINESS</div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <Row label="نوع العملية" value={purposeLabel(params.purpose)} />
            {params.desc && <Row label="الوصف" value={params.desc} />}
            <Row label="العملة" value={params.currency} />
            <div className="my-3 h-px bg-white/15" />
            <div className="flex items-end justify-between">
              <div className="text-xs opacity-80">الإجمالي المستحق</div>
              <div className="num text-3xl font-black">{params.amount.toFixed(2)}</div>
            </div>
          </div>

          <div className="mt-6 space-y-2 text-[11px] font-bold opacity-90">
            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> ضمان استرجاع المبالغ غير المسحوبة</div>
            <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> 3D Secure / تحقق إضافي من البنك</div>
            <div className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> لا نخزّن بيانات البطاقة لدينا</div>
          </div>

          <Link
            to="/wallet"
            className="mt-6 inline-flex items-center gap-1 text-[11px] font-extrabold opacity-90 hover:opacity-100"
          >
            <ArrowLeft className="h-3 w-3" /> العودة للمحفظة
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function TabBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-extrabold transition ${
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="opacity-80">{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  );
}

function purposeLabel(p: string) {
  if (p === "wallet_topup") return "إيداع بالمحفظة";
  if (p === "membership") return "اشتراك / عضوية";
  return "دفعة منصة";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt="IDEA BUSINESS" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-black text-foreground">IDEA BUSINESS</span>
          </Link>
          <div className="flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-[10px] font-extrabold text-success">
            <ShieldCheck className="h-3 w-3" /> اتصال آمن
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
