import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Smartphone, Apple, Download } from "lucide-react";

export const Route = createFileRoute("/mobile")({
  head: () => ({
    meta: [
      { title: "تطبيق الجوال | IDEA BUSINESS" },
      { name: "description", content: "حمّل تطبيق IDEA BUSINESS على iOS و Android." },
    ],
  }),
  component: MobilePage,
});

function MobilePage() {
  const notify = (store: string) =>
    toast.info(`${store}`, { description: "التطبيق قيد المراجعة — سنعلمك فور إطلاقه." });
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10 text-center">
        <PageHeader icon={<Smartphone className="h-6 w-6" />} title="تطبيق الجوال" subtitle="استثمر من جيبك في أي وقت." />
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => notify("App Store")} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-background hover:opacity-90">
            <Apple className="h-5 w-5" /> App Store
          </button>
          <button onClick={() => notify("Google Play")} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-background hover:opacity-90">
            <Download className="h-5 w-5" /> Google Play
          </button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">قريبًا — اشترك بالنشرة لتلقي إشعار الإطلاق.</p>
      </main>
    </div>
  );
}
