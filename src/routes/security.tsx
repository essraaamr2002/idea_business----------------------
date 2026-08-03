import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck, KeyRound, Smartphone } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [
    { title: "الأمان | IDEA BUSINESS" },
    { name: "description", content: "كلمة المرور والتحقق بخطوتين وأجهزة الدخول." },
  ]}),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="الأمان" subtitle="حافظ على حسابك آمناً." />
        <div className="space-y-3">
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><h3 className="text-base font-black">كلمة المرور</h3></div>
            <p className="mt-1 text-xs text-muted-foreground">آخر تحديث منذ 30 يوماً.</p>
            <Link to="/auth" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-xs font-extrabold text-primary-foreground">تغيير كلمة المرور</Link>
          </section>
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /><h3 className="text-base font-black">التحقق بخطوتين (2FA)</h3><span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">قريباً</span></div>
            <p className="mt-1 text-xs text-muted-foreground">طبقة حماية إضافية لتسجيل الدخول — قيد التطوير.</p>
            <Link to="/security/2fa" className="mt-3 inline-block rounded-md border border-border bg-card px-4 py-2 text-xs font-extrabold hover:border-primary">تفاصيل</Link>
          </section>
        </div>
      </main>
    </div>
  );
}
