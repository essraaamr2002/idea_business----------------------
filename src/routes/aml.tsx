import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/aml")({
  head: () => ({ meta: [
    { title: "سياسة مكافحة غسل الأموال | IDEA BUSINESS" },
    { name: "description", content: "التزامنا بمكافحة غسل الأموال وتمويل الإرهاب." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<ShieldAlert className="h-6 w-6" />} title="سياسة مكافحة غسل الأموال (AML)" subtitle="التزامنا بالامتثال." />
        <div className="space-y-4 text-sm leading-7">
          <p>نلتزم بأعلى معايير مكافحة غسل الأموال (AML) وتمويل الإرهاب (CFT). نطبّق سياسات اعرف عميلك (KYC) ومراقبة المعاملات والإبلاغ عن الأنشطة المشبوهة.</p>
          <ul className="space-y-2 rounded-2xl border border-border bg-card/60 p-5">
            <li>• التحقق من هوية كل مستخدم قبل تفعيل العمليات المالية.</li>
            <li>• مراقبة المعاملات غير الاعتيادية وحجبها عند الحاجة.</li>
            <li>• الاحتفاظ بسجلات لمدة لا تقل عن المتطلبات النظامية.</li>
            <li>• التعاون الكامل مع الجهات الرقابية المختصة.</li>
          </ul>
        </div>
      </main>
    </div>
  ),
});
