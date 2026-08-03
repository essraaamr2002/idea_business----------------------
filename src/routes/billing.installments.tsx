import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

export const Route = createFileRoute("/billing/installments")({
  head: () => ({ meta: [{ title: "خطط التقسيط — IDEA BUSINESS" }] }),
  component: InstallmentsPage,
});

function InstallmentsPage() {
  const plans = [
    { name: "3 أشهر", fee: "0%", note: "بدون فوائد" },
    { name: "6 أشهر", fee: "2.5%", note: "رسوم رمزية" },
    { name: "12 شهر", fee: "5%", note: "الأقل شهرياً" },
  ];
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><CreditCard className="h-7 w-7 text-primary" /> ادفع على دفعات</h1>
      <p className="mt-2 text-sm text-muted-foreground">قسّم اشتراكك أو استثمارك على دفعات مريحة عبر شركاء التقسيط (Tabby / Tamara / Klarna).</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name}>
            <CardHeader><CardTitle className="flex items-center justify-between">{p.name}<Badge variant="secondary">{p.fee}</Badge></CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{p.note}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
