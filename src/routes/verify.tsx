import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { BadgeCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VerificationSystem } from "@/components/VerificationSystem";
import { BrandLoader } from "@/components/BrandLoader";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "تحقّق الهوية بالذكاء الاصطناعي | IDEA BUSINESS" },
      { name: "description", content: "وثّق حسابك في دقائق بصورة بطاقتك أو جوازك وسيلفي — نظام KYC ذكي." },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <PageHeader
          icon={<BadgeCheck className="h-6 w-6" />}
          title="توثيق الحساب بالذكاء الاصطناعي"
          subtitle="صوّر بطاقتك أو جوازك + سيلفي، ويتولّى الذكاء الاصطناعي التحقق خلال ثوانٍ."
        />

        {(!user || loading) ? (
          <BrandLoader />
        ) : (
          <VerificationSystem userId={user.id} onComplete={() => { /* refresh handled inside */ }} />
        )}

        <div className="text-center">
          <Link to="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> العودة للملف الشخصي
          </Link>
        </div>
      </main>
    </div>
  );
}
