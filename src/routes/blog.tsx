import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listArticles } from "@/lib/news.functions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, Sparkles } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "المدوّنة — IDEA BUSINESS" },
      { name: "description", content: "تحليلات، أدلة، ودراسات حول الاستثمار وريادة الأعمال في العالم العربي. مقالات يكتبها فريق IDEA BUSINESS." },
      { property: "og:title", content: "مدوّنة IDEA BUSINESS" },
      { property: "og:description", content: "تحليلات وأدلة من فريق IDEA BUSINESS." },
      { property: "og:url", content: "https://busniss.org/blog" },
    ],
    links: [{ rel: "canonical", href: "https://busniss.org/blog" }],
  }),
  component: BlogPage,
});

function BlogPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["blog", "list"],
    queryFn: () => listArticles({ data: { limit: 50, categories: ["blog", "guide", "analysis"] } }),
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
        <PageHeader
          icon={<BookOpen className="h-6 w-6" />}
          title="المدوّنة"
          subtitle="تحليلات وأدلة من فريق IDEA BUSINESS — يكتبها متخصصون في الاستثمار وريادة الأعمال."
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : !items?.length ? (
          <div className="rounded-2xl border border-border bg-card/60 p-8 text-center">
            <p className="text-muted-foreground mb-3">لم تُنشر مقالات بعد.</p>
            <Link to="/news" className="text-primary font-semibold hover:underline">تابع آخر الأخبار والأحداث المباشرة ←</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((a: any) => (
              <Link key={a.id} to="/news/$slug" params={{ slug: a.slug }} className="block group">
                <Card className="h-full hover:border-primary transition-colors">
                  {a.cover_image_url && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img src={a.cover_image_url} alt={a.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">{a.category === "blog" ? "مدوّنة" : a.category === "guide" ? "دليل" : "تحليل"}</Badge>
                      {a.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> AI</Badge>}
                      <span className="text-xs text-muted-foreground mr-auto">{new Date(a.created_at).toLocaleDateString("ar-EG")}</span>
                    </div>
                    <CardTitle className="text-lg leading-snug group-hover:text-primary">{a.title}</CardTitle>
                  </CardHeader>
                  {a.excerpt && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">{a.excerpt}</p>
                      <div className="mt-3 flex items-center gap-1 text-sm text-primary">اقرأ المزيد <ArrowLeft className="h-3 w-3" /></div>
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
