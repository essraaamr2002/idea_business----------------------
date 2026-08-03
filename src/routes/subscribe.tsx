import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Mail } from "lucide-react";
import { NewsletterSignup } from "@/components/NewsletterSignup";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "اشترك في النشرة | IDEA BUSINESS" },
      { name: "description", content: "احصل على أهم الفرص والتحليلات في بريدك أسبوعيًا." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-xl px-4 py-10">
        <PageHeader icon={<Mail className="h-6 w-6" />} title="نشرة IDEA BUSINESS" subtitle="أهم الفرص والتحليلات في بريدك أسبوعيًا." />
        <NewsletterSignup />
      </main>
    </div>
  ),
});
