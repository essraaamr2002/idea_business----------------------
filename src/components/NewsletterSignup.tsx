import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeNewsPublic } from "@/lib/news.functions";
import { toast } from "sonner";

export function NewsletterSignup() {
  const subscribe = useServerFn(subscribeNewsPublic);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "pending" | "already">(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) { toast.error("بريد إلكتروني غير صحيح"); return; }
    setBusy(true);
    try {
      const r: any = await subscribe({ data: { email: email.trim().toLowerCase() } });
      if (r?.already) { setDone("already"); toast.success("اشتراكك مُفعّل مسبقًا"); }
      else { setDone("pending"); toast.success("تم إرسال رسالة تأكيد إلى بريدك"); }
    } catch (err: any) {
      const msg = err?.message === "rate_limited" ? "محاولات كثيرة، حاول لاحقًا" : (err?.message || "تعذّر الاشتراك");
      toast.error(msg);
    } finally { setBusy(false); }
  };

  if (done === "pending") {
    return (
      <div className="w-full rounded-2xl border border-border bg-card/60 p-4 text-center">
        <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <p className="font-bold">تحقّق من بريدك</p>
        <p className="text-sm text-muted-foreground">
          أرسلنا رابط تأكيد إلى <span className="font-mono text-foreground">{email}</span>. اضغطه لتفعيل اشتراكك.
        </p>
      </div>
    );
  }

  if (done === "already") {
    return (
      <div className="flex items-center justify-center gap-2 w-full rounded-2xl border border-border bg-card/60 p-4 text-sm font-bold">
        <Check className="h-4 w-4 text-primary" /> اشتراكك مُفعّل مسبقًا — شكراً لك!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card/60 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground sm:w-1/3">
        <Mail className="h-4 w-4 text-primary" /> اشترك بنشرة الفرص الأسبوعية
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="بريدك الإلكتروني"
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        disabled={busy}
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ...</> : "اشترك"}
      </button>
    </form>
  );
}
