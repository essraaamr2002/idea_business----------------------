import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Settings as SettingsIcon, User, Bell, Lock, Globe, CreditCard } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "الإعدادات | IDEA BUSINESS" },
    { name: "description", content: "إدارة الحساب، الخصوصية، الإشعارات والأمان." },
  ]}),
  component: () => {
    const sec: { i: any; t: string; d: string; to: any }[] = [
      { i: User, t: "الملف الشخصي", d: "الاسم والصورة وبيانات التواصل", to: "/profile" },
      { i: Bell, t: "الإشعارات", d: "إدارة قنوات التنبيه", to: "/notifications" },
      { i: Lock, t: "الأمان", d: "كلمة المرور والتحقق بخطوتين", to: "/security" },
      { i: Globe, t: "اللغة والمنطقة", d: "اللغة، التوقيت، العملة", to: "/profile" },
      { i: CreditCard, t: "الفوترة", d: "العضوية وطرق الدفع", to: "/membership" },
    ];
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-3xl px-4 py-10">
          <PageHeader icon={<SettingsIcon className="h-6 w-6" />} title="الإعدادات" subtitle="إدارة حسابك وتفضيلاتك." />
          <div className="grid gap-3 sm:grid-cols-2">
            {sec.map((s) => (
              <Link key={s.t} to={s.to} className="group flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 hover:border-primary">
                <s.i className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <div className="font-extrabold group-hover:text-primary">{s.t}</div>
                  <div className="text-xs text-muted-foreground">{s.d}</div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  },
});
