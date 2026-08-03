import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock } from "lucide-react";

export const Route = createFileRoute("/security/2fa")({
  head: () => ({ meta: [{ title: "المصادقة الثنائية — IDEA BUSINESS" }] }),
  component: TwoFAPage,
});

function TwoFAPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" /> المصادقة الثنائية
        </h1>
        <Badge className="bg-amber-500/15 text-amber-600 flex items-center gap-1">
          <Clock className="h-3 w-3" /> قريباً
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>هذه الميزة قيد التطوير</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-7">
          <p>
            نعمل حالياً على دمج المصادقة الثنائية (TOTP) بشكل آمن ومرتبط فعلياً بعملية تسجيل الدخول.
            لم يتم تفعيل هذه الميزة بعد، ولا يوجد أي حساب يستخدم 2FA حقيقي في الوقت الحالي.
          </p>
          <p>
            للحفاظ على أمان حسابك الآن: استخدم كلمة مرور قوية وفريدة، ولا تشاركها مع أحد،
            وراجع جلسات تسجيل الدخول من صفحة الأمان بشكل دوري.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
