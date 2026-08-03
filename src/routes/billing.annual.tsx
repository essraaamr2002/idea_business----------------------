import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Sparkles, ShieldCheck, Gift } from "lucide-react";

export const Route = createFileRoute("/billing/annual")({
  head: () => ({ meta: [{ title: "خصم سنوي 25% — IDEA BUSINESS" }, { name: "description", content: "احصل على خصم 25% عند الاشتراك السنوي مع مزايا حصرية." }] }),
  component: AnnualPage,
});

function AnnualPage() {
  const plans = [
    { name: "فضي", monthly: 49, save: 147 },
    { name: "ذهبي", monthly: 99, save: 297 },
    { name: "بلاتيني", monthly: 199, save: 597 },
  ];
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <Badge className="bg-primary/10 text-primary">عرض الاستمرارية</Badge>
        <h1 className="mt-3 text-4xl font-black">وفر 25% بالاشتراك السنوي</h1>
        <p className="mt-2 text-muted-foreground">ادفع لمرة واحدة، استثمر بهدوء طوال العام، واحصل على شارة "عضو سنوي".</p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{p.name}</span>
                <Badge variant="secondary">-25%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-black">${(p.monthly * 12 * 0.75).toFixed(0)}<span className="text-sm font-normal text-muted-foreground"> /سنة</span></div>
              <div className="text-xs text-muted-foreground">توفير ${p.save} مقارنة بالشهري</div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> شارة عضو سنوي</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> ضمان استرداد 14 يوم</li>
                <li className="flex items-center gap-2"><Gift className="h-4 w-4 text-primary" /> 500 نقطة ولاء هدية</li>
                <li className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> أولوية الدعم</li>
              </ul>
              <Button className="w-full" asChild><Link to="/membership">اشترك سنوياً</Link></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
