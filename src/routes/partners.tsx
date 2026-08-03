import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Globe, Banknote, Scale } from "lucide-react";

export const Route = createFileRoute("/partners")({
  head: () => ({ meta: [{ title: "شراكات استراتيجية — IDEA BUSINESS" }] }),
  component: Partners,
});

function Partners() {
  const cats = [
    { icon: Banknote, name: "بنوك ومحافظ رقمية", note: "تكامل سحب/إيداع فوري." },
    { icon: Scale, name: "مكاتب قانونية", note: "صياغة عقود استثمار وضمانات." },
    { icon: Globe, name: "حاضنات أعمال", note: "تخريج مشاريع جاهزة للتمويل." },
    { icon: Handshake, name: "صناديق VC", note: "تمويل المراحل المتقدمة." },
  ];
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2"><Handshake className="h-7 w-7 text-primary" /> شراكاتنا الاستراتيجية</h1>
      <p className="mt-2 text-sm text-muted-foreground">نبني شبكة شراكات عالمية تضمن استدامة المنصة وتوسعها.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {cats.map((c) => {
          const I = c.icon;
          return (
            <Card key={c.name}>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><I className="h-5 w-5 text-primary" />{c.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{c.note}</CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>اقترح شراكة</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">راسلنا على partners@busniss.org مع تفاصيل مؤسستك.</CardContent>
      </Card>
    </div>
  );
}
