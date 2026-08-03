import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getArticle } from "@/lib/news.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ShareButtons } from "@/components/ShareButtons";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const Route = createFileRoute("/news/$slug")({
  head: ({ loaderData, params }) => {
    const a = loaderData as {
      title: string; excerpt: string | null; cover_image_url: string | null;
      created_at?: string; updated_at?: string;
    } | undefined;
    const url = `https://busniss.org/news/${params.slug}`;
    if (!a) return { meta: [{ title: "خبر — IDEA BUSINESS" }] };
    const desc = a.excerpt || a.title;
    const ld = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: a.title,
      description: desc,
      image: a.cover_image_url ? [a.cover_image_url] : undefined,
      datePublished: a.created_at,
      dateModified: a.updated_at || a.created_at,
      author: { "@type": "Organization", name: "IDEA BUSINESS" },
      publisher: {
        "@type": "Organization",
        name: "IDEA BUSINESS",
        logo: { "@type": "ImageObject", url: "https://busniss.org/logo.png" },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    };
    return {
      meta: [
        { title: `${a.title} — IDEA BUSINESS` },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:title", content: a.title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        ...(a.cover_image_url ? [{ property: "og:image", content: a.cover_image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: a.title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(ld) },
      ],
    };
  },

  loader: async ({ params }) => {
    try {
      return await getArticle({ data: { slug: params.slug } });
    } catch {
      throw notFound();
    }
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <div className="container mx-auto max-w-3xl px-4 py-16 text-center" dir="rtl">
      <h1 className="text-2xl font-bold mb-2">المقال غير موجود</h1>
      <Link to="/news"><Button>العودة للأخبار</Button></Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data: article } = useQuery({
    queryKey: ["news", "article", slug],
    queryFn: () => getArticle({ data: { slug } }),
    initialData: Route.useLoaderData() as any,
  });

  if (!article) return null;
  return (
    <>
    <ReadingProgress />
    <article className="container mx-auto max-w-3xl px-4 py-8" dir="rtl">
      <Link to="/news" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowRight className="h-4 w-4" /> العودة لكل الأخبار
      </Link>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary">{article.category === "events" ? "حدث" : "خبر"}</Badge>
        {article.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> ذكاء صناعي</Badge>}
        <span className="text-xs text-muted-foreground">{new Date(article.created_at).toLocaleDateString("ar-EG")}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
      {article.excerpt && <p className="text-lg text-muted-foreground mb-6">{article.excerpt}</p>}
      {article.cover_image_url && (
        <img src={article.cover_image_url} alt={article.title} className="w-full rounded-lg mb-8" />
      )}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{article.content}</ReactMarkdown>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <ShareButtons title={article.title} url={typeof window !== "undefined" ? window.location.href : ""} />
        <CopyLinkButton />
      </div>
    </article>
    </>
  );
}
