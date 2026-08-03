import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { LifeBuoy, MessageCircle, BookOpen, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [
    { title: "مركز المساعدة | IDEA BUSINESS" },
    { name: "description", content: "أدلة، مقالات، وموارد لمساعدتك في استخدام منصة IDEA BUSINESS." },
    { property: "og:title", content: "مركز المساعدة — IDEA BUSINESS" },
  ]}),
  component: () => {
    const cats = [
      { i: BookOpen, t: "البدء", d: "أساسيات استخدام المنصة", to: "/how-it-works" as const },
      { i: ShieldCheck, t: "الأمان والخصوصية", d: "كيف نحمي بياناتك", to: "/privacy" as const },
      { i: MessageCircle, t: "الدعم المباشر", d: "تواصل مع فريقنا", to: "/support" as const },
    ];
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <PageHeader icon={<LifeBuoy className="h-6 w-6" />} title="مركز المساعدة" subtitle="نحن هنا لمساعدتك." />
          <div className="grid gap-4 md:grid-cols-3">
            {cats.map((c) => (
              <Link key={c.t} to={c.to} className="group rounded-2xl border border-border bg-card/60 p-5 hover:border-primary">
                <c.i className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-lg font-black group-hover:text-primary">{c.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  },
});
