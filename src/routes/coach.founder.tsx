import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, Sparkles } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/coach/founder")({
  head: () => ({ meta: [{ title: "مدرب صاحب المشروع — IDEA BUSINESS" }] }),
  component: FounderCoach,
});

const TIPS = [
  "ركّز على شريحة واحدة من العملاء في أول 6 أشهر.",
  "أضف فيديو تعريفي 60 ثانية — يرفع التمويل 1.6x.",
  "حدّث المستثمرين أسبوعياً ولو بسطرين — الثقة = تمويل متكرر.",
  "اعرض KPIs واضحة: MRR، CAC، LTV، Churn.",
  "اطلب شهادات عملاء حقيقية بصور وأسماء.",
];

function FounderCoach() {
  const [q, setQ] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  const ask = () => {
    if (!q.trim()) return;
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    setAns(`بناءً على وضع مشروعك:\n\n${tip}`);
  };
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Rocket className="h-7 w-7 text-primary" /> مدرب صاحب المشروع</h1>
      <p className="mt-2 text-sm text-muted-foreground">نصائح ذكية لجذب المستثمرين ورفع نسبة نجاح حملتك.</p>
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> اسأل المدرب</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: كيف أرفع التمويل من 30% إلى 100%؟" />
          <Button onClick={ask}>اطلب نصيحة</Button>
          {ans && <div className="whitespace-pre-line rounded-lg border bg-muted/30 p-3 text-sm">{ans}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
