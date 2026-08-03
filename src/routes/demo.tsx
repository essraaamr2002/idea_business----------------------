import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { PlayCircle } from "lucide-react";

export const Route = createFileRoute("/demo")({
  head: () => ({ meta: [
    { title: "جولة تفاعلية | IDEA BUSINESS" },
    { name: "description", content: "شاهد كيف تعمل المنصة في 60 ثانية." },
  ]}),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<PlayCircle className="h-6 w-6" />} title="جولة تفاعلية" subtitle="60 ثانية تكشف لك كل شيء." />
        <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
          <div className="aspect-video w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <PlayCircle className="h-20 w-20 text-primary" />
          </div>
          <div className="p-5">
            <h3 className="text-lg font-black">شاهد المنصة بنفسك</h3>
            <p className="mt-1 text-sm text-muted-foreground">من اكتشاف الفرصة حتى أول استثمار، خطوة بخطوة.</p>
            <Link to="/onboarding" className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground hover:bg-primary/90">ابدأ الجولة</Link>
          </div>
        </div>
      </main>
    </div>
  ),
});
