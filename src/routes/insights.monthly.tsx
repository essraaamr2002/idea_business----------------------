import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Eye, MousePointerClick, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/insights/monthly")({
  head: () => ({ meta: [{ title: "ملخص الأداء الشهري — IDEA BUSINESS" }] }),
  component: MonthlyInsights,
});

function MonthlyInsights() {
  const month = new Date().toLocaleDateString("ar", { month: "long", year: "numeric" });
  const kpis = [
    { label: "مشاهدات مشاريعك", value: "12,438", delta: "+18%", icon: Eye },
    { label: "النقرات", value: "1,920", delta: "+9%", icon: MousePointerClick },
    { label: "تمويل مستلم", value: "$8,250", delta: "+24%", icon: DollarSign },
    { label: "متابعون جدد", value: "143", delta: "+11%", icon: Users },
  ];
  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">ملخصك لشهر {month}</h1>
        <TrendingUp className="h-7 w-7 text-primary" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">تقرير تلقائي لأدائك على المنصة. يصلك في بريدك أول كل شهر.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const I = k.icon;
          return (
            <Card key={k.label}>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground flex items-center gap-2"><I className="h-4 w-4" />{k.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-black">{k.value}</div>
                <div className="text-xs text-emerald-600">{k.delta} عن الشهر الماضي</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>توصيات تحسين</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• حدّث صور الغلاف لزيادة CTR بمعدل 22%.</p>
          <p>• أضف فيديو تعريفي قصير — المشاريع التي تحتوي فيديو ترفع التمويل 1.6x.</p>
          <p>• استهدف ساعات النشاط الذروة بين 8م - 11م.</p>
        </CardContent>
      </Card>
    </div>
  );
}
