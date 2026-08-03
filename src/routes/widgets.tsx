import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { EmbedSnippet } from "@/components/EmbedSnippet";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/widgets")({
  head: () => ({
    meta: [
      { title: "ودجات التضمين | IDEA BUSINESS" },
      { name: "description", content: "ضمّن إحصاءات منصتك أو مشاريعك في موقعك." },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader icon={<Code2 className="h-6 w-6" />} title="الودجات القابلة للتضمين" subtitle="انسخ كود التضمين وأضفه لموقعك." />
        <div className="space-y-4">
          <EmbedSnippet label="ودجة شارة المشروع" code={`<iframe src="https://busniss.org/embed/project/123" width="320" height="180" frameborder="0"></iframe>`} />
          <EmbedSnippet label="ودجة العداد المباشر" code={`<iframe src="https://busniss.org/embed/counter" width="320" height="120" frameborder="0"></iframe>`} />
          <EmbedSnippet label="ودجة أعلى المستثمرين" code={`<iframe src="https://busniss.org/embed/leaderboard" width="320" height="400" frameborder="0"></iframe>`} />
        </div>
      </main>
    </div>
  ),
});
