import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ShieldCheck, Lock, FileCheck, Eye } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({ meta: [
    { title: "مركز الثقة | IDEA BUSINESS" },
    { name: "description", content: "كيف نحمي بياناتك وأموالك — أمن، خصوصية، وشفافية." },
    { property: "og:title", content: "مركز الثقة — IDEA BUSINESS" },
  ]}),
  component: () => {
    const items: { i: any; t: string; d: string; to: any }[] = [
      { i: Lock, t: "تشفير من الطرف للطرف", d: "بياناتك مشفّرة أثناء النقل والتخزين.", to: "/security" },
      { i: FileCheck, t: "ضمانات قانونية", d: "عقود موثّقة تحمي حقوقك.", to: "/privacy" },
      { i: Eye, t: "إفصاحات شفافة", d: "نُفصح عن المخاطر والرسوم بوضوح.", to: "/risk-disclosure" },
      { i: ShieldCheck, t: "امتثال AML/KYC", d: "نتّبع أعلى المعايير العالمية.", to: "/aml" },
    ];
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-5xl px-4 py-10">
          <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="مركز الثقة" subtitle="ثقتك أولويتنا." />
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((x) => (
              <Link key={x.t} to={x.to} className="group rounded-2xl border border-border bg-card/60 p-5 hover:border-primary">
                <x.i className="h-6 w-6 text-primary" />
                <h3 className="mt-2 font-black group-hover:text-primary">{x.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    );
  },
});
