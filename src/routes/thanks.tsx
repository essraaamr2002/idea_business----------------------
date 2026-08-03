import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/thanks")({
  head: () => ({
    meta: [
      { title: "شكرًا لك | IDEA BUSINESS" },
      { name: "description", content: "شكرًا لانضمامك لرحلتنا!" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <Sparkles className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 text-3xl font-bold">شكرًا لك!</h1>
        <p className="mt-2 text-muted-foreground">تم استلام طلبك بنجاح. سنعود إليك قريبًا.</p>
        <a href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:opacity-90">
          عودة للرئيسية <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      </main>
    </div>
  ),
});
