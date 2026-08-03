import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { CopyButton } from "@/components/CopyButton";
import { Key } from "lucide-react";

export const Route = createFileRoute("/api-keys")({
  head: () => ({
    meta: [
      { title: "مفاتيح API | IDEA BUSINESS" },
      { name: "description", content: "أنشئ وأدر مفاتيح API الخاصة بحسابك." },
    ],
  }),
  component: ApiKeysPage,
});

function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Key className="h-6 w-6" />} title="مفاتيح API" subtitle="للوصول البرمجي لحسابك (تجريبي)." />
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <div className="mb-2 text-xs text-muted-foreground">مفتاحك الافتراضي</div>
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3 font-mono text-xs" dir="ltr">
            <code className="truncate">sk_live_••••••••••••••••6f4a</code>
            <CopyButton text="sk_live_demo_6f4a" />
          </div>
          <button
            onClick={() => toast.success("تم تقديم الطلب", { description: "سيتم تفعيل مفاتيح API بعد التحقق من الحساب." })}
            className="mt-4 w-full rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            + إنشاء مفتاح جديد
          </button>
        </div>
      </main>
    </div>
  );
}
