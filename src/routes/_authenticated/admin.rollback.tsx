import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { History, ShieldCheck } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/rollback')({
  head: () => ({ meta: [{ title: 'الرجوع الآمن (Rollback) | IDEA BUSINESS' }] }),
  component: RollbackPage,
});

function RollbackPage() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl" dir="rtl" lang="ar">
      <div className="flex items-center gap-3">
        <History className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">الرجوع الآمن للإصدار السابق</h1>
      </div>

      <Alert>
        <ShieldCheck className="w-4 h-4" />
        <AlertDescription>
          كل نشر يحفظ نسخة كاملة من الكود وقاعدة البيانات. عند فشل النشر أو ظهور خطأ حرج، يبقى الإصدار السابق
          يعمل تلقائياً — بدون انقطاع.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>كيف يعمل الاسترجاع؟</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7">
          <p>
            <strong>1. الحفظ التلقائي:</strong> كل تعديل تعتمده يُنشئ نقطة استرجاع للكود ولقاعدة البيانات.
          </p>
          <p>
            <strong>2. اكتشاف الفشل:</strong> إذا فشل البناء أو ارتفعت أخطاء الخادم بعد النشر، يظل الإصدار السابق
            هو المنشور فعلاً حتى تُصلح المشكلة.
          </p>
          <p>
            <strong>3. الرجوع اليدوي:</strong> افتح سجل الإصدارات (History) من أعلى المحادثة، اختر آخر نسخة
            تعمل، ثم استعِدها. يعود الموقع خلال ثوانٍ.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
