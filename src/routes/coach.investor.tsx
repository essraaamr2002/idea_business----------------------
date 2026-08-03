import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/coach/investor")({
  head: () => ({ meta: [{ title: "مدرب المستثمر الذكي — IDEA BUSINESS" }] }),
  component: InvestorCoach,
});

const TIPS = [
  "نوّع محفظتك بين 5-8 قطاعات على الأقل لتقليل المخاطر.",
  "خصص 60% للمشاريع المستقرة و30% للنمو و10% للمخاطرة العالية.",
  "أعد تقييم محفظتك كل 3 أشهر، لا تتسرع بالبيع عند أول هزة.",
  "تابع المؤسسين قبل المشاريع — التنفيذ أهم من الفكرة.",
  "لا تستثمر مبلغاً لا تتحمل خسارته — استخدم قاعدة 5% من السيولة.",
];

function InvestorCoach() {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  const ask = () => {
    if (!q.trim()) return;
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    setAns(`بناءً على سؤالك: "${q}"\n\nاقتراحي: ${tip}`);
  };
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Brain className="h-7 w-7 text-primary" /> مدرب المستثمر الذكي</h1>
      <p className="mt-2 text-sm text-muted-foreground">مساعد ذكي يحلل محفظتك ويقترح خطوات لتعظيم العائد.</p>
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> اسأل المدرب</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: كيف أوزع $5000 على المشاريع التقنية؟" />
          <Button onClick={ask}>اطلب توصية</Button>
          {ans && <div className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">{ans}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
