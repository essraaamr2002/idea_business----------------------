import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, CheckCircle2, Users } from "lucide-react";
import { captureUtmFromLocation } from "@/lib/utm";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "مرحباً بك في IDEA BUSINESS — هدية ترحيب بانتظارك" },
      { name: "description", content: "دخلت برابط صديق؟ احصل على خصم ترحيبي + نقاط ولاء فور التسجيل." },
      { property: "og:title", content: "مرحباً بك — هدية ترحيب من IDEA BUSINESS" },
      { property: "og:description", content: "خصم ترحيبي + نقاط ولاء عند التسجيل برابط صديق." },
    ],
  }),
  component: WelcomePage,
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
    by: typeof s.by === "string" ? s.by : undefined,
  }),
});

function WelcomePage() {
  const { ref, by } = Route.useSearch();
  const [code, setCode] = useState(ref);

  useEffect(() => {
    captureUtmFromLocation();
    if (ref) {
      try { localStorage.setItem("pending_referral_code", ref); } catch {}
      setCode(ref);
    } else {
      try {
        const stored = localStorage.getItem("pending_referral_code");
        if (stored) setCode(stored);
      } catch {}
    }
  }, [ref]);

  const authHref = code ? `/auth?ref=${encodeURIComponent(code)}` : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent p-8 text-center backdrop-blur">
          <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-primary text-3xl">
            🎁
          </div>
          <h1 className="text-3xl font-black md:text-4xl">مرحباً بك في IDEA BUSINESS</h1>
          {by ? (
            <p className="mt-2 text-lg text-muted-foreground">
              دعاك <span className="font-extrabold text-primary">@{by}</span> للانضمام
            </p>
          ) : code ? (
            <p className="mt-2 text-lg text-muted-foreground">
              دخلت برابط دعوة — كود: <span className="font-black text-primary">{code}</span>
            </p>
          ) : (
            <p className="mt-2 text-lg text-muted-foreground">منصة الاستثمار في المشاريع الذكية</p>
          )}

          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-start sm:grid-cols-3">
            <Benefit icon={<Gift />} title="هدية ترحيب" desc="٥٠ نقطة ولاء فور التسجيل" />
            <Benefit icon={<Sparkles />} title="عضوية مرقّاة" desc="تجربة كاملة لـ٧ أيام مجاناً" />
            <Benefit icon={<Users />} title="مجتمع نشط" desc="آلاف المستثمرين والمؤسسين" />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={authHref as "/auth"}>
              <Button size="lg" className="font-extrabold">
                ابدأ الآن مجاناً
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button size="lg" variant="outline" className="font-extrabold">
                كيف تعمل المنصة؟
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            <CheckCircle2 className="me-1 inline h-3 w-3 text-green-verified" />
            بدون رسوم اشتراك للبدء — ابدأ بحساب مجاني.
          </p>
        </div>
      </main>
    </div>
  );
}

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="font-extrabold">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
