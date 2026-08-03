import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Timeline } from "@/components/Timeline";
import { Flag, Rocket, Award, Users } from "lucide-react";

export const Route = createFileRoute("/our-story")({
  head: () => ({
    meta: [
      { title: "قصتنا | IDEA BUSINESS" },
      { name: "description", content: "رحلة IDEA BUSINESS من الفكرة إلى منصة استثمارية رائدة." },
      { property: "og:title", content: "قصتنا — IDEA BUSINESS" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader icon={<Flag className="h-6 w-6" />} title="قصتنا" subtitle="من فكرة إلى منصة استثمارية رائدة." />
        <Timeline items={[
          { date: "2023", title: "ولادة الفكرة", desc: "بدأنا بحلم تمكين الجميع من المشاركة في الاقتصاد.", icon: <Flag className="h-2 w-2 text-primary-foreground" /> },
          { date: "2024", title: "إطلاق النسخة التجريبية", desc: "أول 100 مستثمر و10 مشاريع ممولة.", icon: <Rocket className="h-2 w-2 text-primary-foreground" /> },
          { date: "2025", title: "ترخيص رسمي", desc: "حصلنا على اعتماد الجهات التنظيمية.", icon: <Award className="h-2 w-2 text-primary-foreground" /> },
          { date: "2026", title: "12,000 مستثمر", desc: "تجاوزنا 84 مليون ريال تمويلات.", icon: <Users className="h-2 w-2 text-primary-foreground" /> },
        ]} />
      </main>
    </div>
  ),
});
