import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Users, Calendar, Lock } from "lucide-react";

export const Route = createFileRoute("/inner-circle")({
  head: () => ({ meta: [{ title: "الدائرة الذهبية — IDEA BUSINESS" }] }),
  component: InnerCircle,
});

function InnerCircle() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-2">
        <Crown className="h-8 w-8 text-amber-500" />
        <h1 className="text-3xl font-black">الدائرة الذهبية (Inner Circle)</h1>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">مجتمع مغلق لأعضاء الذهبي والبلاتيني — صفقات حصرية، جلسات شهرية مع خبراء، وفرص قبل أن تُعلَن للعموم.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-5 w-5" /> صفقات مغلقة</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">مشاريع تُعرض هنا قبل المنصة بأسبوع.</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-5 w-5" /> جلسات شهرية</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">AMA مع مستثمرين ومؤسسي شركات ناجحة.</CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-5 w-5" /> مجتمع مغلق</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">شبكة علاقات نخبة، Discord خاص.</CardContent></Card>
      </div>
      <div className="mt-6">
        <Button asChild><Link to="/membership">رقّي عضويتك للانضمام</Link></Button>
      </div>
    </div>
  );
}
