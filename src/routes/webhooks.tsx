import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Webhook } from "lucide-react";

export const Route = createFileRoute("/webhooks")({
  head: () => ({
    meta: [
      { title: "Webhooks | IDEA BUSINESS" },
      { name: "description", content: "استقبل أحداث المنصة لحظيًا على خوادمك." },
    ],
  }),
  component: WebhooksPage,
});

function WebhooksPage() {
  const [url, setUrl] = useState("");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Webhook className="h-6 w-6" />} title="Webhooks" subtitle="اشترك في أحداث المنصة وادفعها لخدماتك." />
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <label className="block text-xs text-muted-foreground">رابط الـ Webhook</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/hook"
            dir="ltr"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {["investment.created", "investment.failed", "kyc.approved", "wallet.payout"].map((e) => (
              <label key={e} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2"><input type="checkbox" defaultChecked /><span dir="ltr" className="text-xs">{e}</span></label>
            ))}
          </div>
          <button
            onClick={() => {
              if (!url || !/^https?:\/\//i.test(url)) {
                toast.error("رابط غير صالح", { description: "يجب أن يبدأ الرابط بـ http(s)://" });
                return;
              }
              toast.success("تم حفظ الـ Webhook", { description: url });
            }}
            className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          >
            حفظ
          </button>
        </div>
      </main>
    </div>
  );
}
