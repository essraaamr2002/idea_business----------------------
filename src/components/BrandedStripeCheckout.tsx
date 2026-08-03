import { useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createStripeIntent, getStripePublishableKey } from "@/lib/stripe.functions";
import { Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

type Props = {
  amount: number;
  currency: string;
  purpose: "wallet_topup" | "checkout" | "membership" | "seriousness_deposit";
  returnUrl: string;
};

let _stripePromise: Promise<Stripe | null> | null = null;
function getStripe(pk: string) {
  if (!_stripePromise) _stripePromise = loadStripe(pk);
  return _stripePromise;
}

export function BrandedStripeCheckout(props: Props) {
  const [pk, setPk] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fetchPk = useServerFn(getStripePublishableKey);
  const createIntent = useServerFn(createStripeIntent);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { publishableKey } = await fetchPk();
        if (!live) return;
        if (!publishableKey) {
          setErr("لم يتم تفعيل بوابة البطاقات بعد.");
          return;
        }
        setPk(publishableKey);
        const intent = await createIntent({
          data: { amount: props.amount, currency: props.currency, purpose: props.purpose },
        });
        if (!live) return;
        setClientSecret(intent.clientSecret);
      } catch (e: any) {
        if (live) setErr(e?.message ?? "تعذّر تهيئة الدفع.");
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.amount, props.currency, props.purpose]);

  if (err) {
    return <div className="rounded-xl bg-destructive/10 p-4 text-sm font-bold text-destructive">{err}</div>;
  }

  if (!pk || !clientSecret) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> جاري تهيئة الدفع الآمن…
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe(pk)}
      options={{
        clientSecret,
        locale: "ar",
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0ea5e9",
            colorBackground: "#ffffff",
            colorText: "#0f172a",
            colorDanger: "#ef4444",
            fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
            borderRadius: "12px",
            spacingUnit: "4px",
          },
        },
      }}
    >
      <InnerForm returnUrl={props.returnUrl} />
    </Elements>
  );
}

function InnerForm({ returnUrl }: { returnUrl: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const ready = useMemo(() => !!stripe && !!elements, [stripe, elements]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) {
      toast.error(error.message ?? "تعذّر إتمام الدفع.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
          wallets: { applePay: "auto", googlePay: "auto" },
        }}
      />
      <button
        type="submit"
        disabled={!ready || busy}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-95 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {busy ? "جاري التأكيد…" : "ادفع الآن بأمان"}
      </button>
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-success" /> الدفع مشفّر — متوافق مع PCI DSS و3D Secure
      </div>
    </form>
  );
}
