import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Activity, Clock } from "lucide-react";

export const Route = createFileRoute("/activity-log")({
  head: () => ({
    meta: [
      { title: "سجل النشاط | IDEA BUSINESS" },
      { name: "description", content: "مراجعة آخر العمليات الأمنية على حسابك." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Activity className="h-6 w-6" />} title="سجل النشاط" subtitle="راقب آخر العمليات على حسابك." />
        <div className="rounded-xl border border-border bg-card/60 p-6 text-sm text-muted-foreground leading-7">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Clock className="h-4 w-4" /> قريباً
          </div>
          <p className="mt-3">
            نعمل على ربط سجل النشاط بأحداث الأمان الحقيقية لحسابك (تسجيلات الدخول، تغيير كلمة المرور،
            الأجهزة الجديدة). لتجنّب عرض بيانات مضلّلة، تم تعطيل المحتوى التجريبي مؤقتاً.
          </p>
          <p className="mt-2">
            إذا لاحظت أي نشاط مشبوه على حسابك، يرجى التواصل مع الدعم فوراً.
          </p>
        </div>
      </main>
    </div>
  ),
});
