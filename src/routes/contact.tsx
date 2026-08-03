import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا | IDEA BUSINESS" },
      { name: "description", content: "تواصل مع فريق IDEA BUSINESS عبر النموذج أو البريد الإلكتروني للدعم والشراكات." },
      { property: "og:title", content: "تواصل معنا — IDEA BUSINESS" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    toast.success("تم استلام رسالتك — سنرد خلال 24 ساعة.");
  };
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-10">
        <PageHeader icon={<MessageCircle className="h-6 w-6" />} title="تواصل معنا" subtitle="نحن هنا للإجابة على أسئلتك ومناقشة الشراكات." />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="space-y-3 md:col-span-1">
            <a href="mailto:support@busniss.org" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm hover:border-primary">
              <Mail className="h-4 w-4 text-primary" /> support@busniss.org
            </a>
            <a href="tel:+000" className="flex items-center gap-2 rounded-xl border border-border bg-card/60 p-3 text-sm hover:border-primary">
              <Phone className="h-4 w-4 text-primary" /> الدعم الهاتفي
            </a>
          </div>
          <form onSubmit={submit} className="md:col-span-2 space-y-3 rounded-2xl border border-border bg-card/60 p-5">
            <input required placeholder="الاسم الكامل" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <input required type="email" placeholder="البريد الإلكتروني" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <input placeholder="الموضوع" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <textarea required rows={5} placeholder="رسالتك…" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            <button type="submit" disabled={sent} className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {sent ? "تم الإرسال" : "إرسال الرسالة"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
