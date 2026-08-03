import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/developers")({
  head: () => ({ meta: [
    { title: "للمطوّرين | IDEA BUSINESS" },
    { name: "description", content: "وثائق API، الـ Webhooks، وأمثلة التكامل." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Code2 className="h-6 w-6" />} title="للمطوّرين" subtitle="ادمج IDEA BUSINESS مع نظامك." />
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <h3 className="text-base font-black">المصادقة</h3>
            <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-xs"><code>{`curl https://api.busniss.org/v1/projects \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code></pre>
          </section>
          <section className="rounded-2xl border border-border bg-card/60 p-5">
            <h3 className="text-base font-black">Webhooks</h3>
            <p className="mt-1 text-sm text-muted-foreground">استقبل تحديثات لحظية: <code>project.funded</code>, <code>investment.created</code>, <code>payout.sent</code>.</p>
          </section>
          <a href="mailto:devs@busniss.org" className="inline-block text-sm font-extrabold text-primary hover:underline">اطلب مفتاح API ←</a>
        </div>
      </main>
    </div>
  ),
});
