import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollText, Clock } from "lucide-react";

export const Route = createFileRoute("/me/audit")({
  head: () => ({ meta: [{ title: "سجل النشاط — IDEA BUSINESS" }] }),
  component: AuditLog,
});

function AuditLog() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black flex items-center gap-2">
        <ScrollText className="h-7 w-7 text-primary" /> سجل النشاط
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        جميع الإجراءات على حسابك. أبلغنا فوراً عن أي نشاط مشبوه.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6 text-sm text-muted-foreground leading-7">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Clock className="h-4 w-4" /> قريباً
          </div>
          <p className="mt-3">
            يتم حالياً ربط هذه الصفحة بأحداث الأمان الحقيقية لحسابك. تم تعطيل البيانات
            التجريبية لتفادي إخفاء أي نشاط غير معتاد قد يحدث على حسابك.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
