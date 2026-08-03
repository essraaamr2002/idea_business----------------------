import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bug, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/bug-bounty")({
  head: () => ({ meta: [{ title: "برنامج مكافآت الثغرات — IDEA BUSINESS" }] }),
  component: BugBounty,
});

function BugBounty() {
  const tiers = [
    { sev: "حرجة", reward: "$1,000 - $5,000", color: "destructive" },
    { sev: "عالية", reward: "$300 - $999", color: "default" },
    { sev: "متوسطة", reward: "$100 - $299", color: "secondary" },
    { sev: "منخفضة", reward: "$25 - $99", color: "outline" },
  ] as const;
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Bug className="h-7 w-7 text-primary" /> برنامج اكتشاف الثغرات</h1>
      <p className="mt-2 text-sm text-muted-foreground">ساعدنا في تأمين المنصة واحصل على مكافأة مالية + شارة "Security Hero".</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {tiers.map((t) => (
          <Card key={t.sev}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-base">{t.sev}<Badge variant={t.color as any}>{t.reward}</Badge></CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">مدفوعات خلال 14 يوم بعد التحقق.</CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> قواعد المشاركة</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>• لا تختبر على حسابات المستخدمين الحقيقية.</p>
          <p>• أرسل تقريرك إلى security@busniss.org مع PoC.</p>
          <p>• لا تنشر الثغرة قبل إصلاحها وموافقتنا.</p>
        </CardContent>
      </Card>
    </div>
  );
}
