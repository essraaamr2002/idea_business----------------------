import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { downloadIcs } from "@/lib/calendar";

export const Route = createFileRoute("/calendar-sync")({
  head: () => ({ meta: [{ title: "مزامنة التقويم — IDEA BUSINESS" }] }),
  component: CalendarSyncPage,
});

function CalendarSyncPage() {
  const next = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
  const events = [
    { title: "موعد إقفال جولة تمويل", description: "آخر فرصة للمشاركة", start: next(7) },
    { title: "السحب الشهري على الجوائز", description: "اربح اشتراك بلاتيني", start: next(14) },
    { title: "تقرير الشفافية الفصلي", start: next(30) },
  ];
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">مزامنة مع تقويمك</h1>
      <p className="mt-2 text-sm text-muted-foreground">احتفظ بمواعيد المنصة في Google / Apple / Outlook Calendar.</p>
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5" /> الأحداث القادمة</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {events.map((e) => (
            <div key={e.title} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-bold">{e.title}</div>
                <div className="text-xs text-muted-foreground">{e.start.toLocaleDateString("ar")}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => downloadIcs(e.title, [e])}>إضافة</Button>
            </div>
          ))}
          <Button className="w-full" onClick={() => downloadIcs("fekra-events", events)}>تنزيل كل الأحداث (.ics)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
