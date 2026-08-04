import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listArticles, subscribeNewsPublic } from "@/lib/news.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mail, ArrowLeft, Radio, Newspaper, BookOpen, Megaphone, Gavel, Repeat, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageState } from "@/components/PageState";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "آخر الأخبار — IDEA BUSINESS" },
      { name: "description", content: "بث مباشر لأحداث المنصة: مشاريع جديدة، صفقات، مزايدات، وإعلانات. اشترك في النشرة البريدية." },
      { property: "og:title", content: "آخر الأخبار — IDEA BUSINESS" },
      { property: "og:description", content: "بث مباشر لأحداث منصة IDEA BUSINESS." },
      { property: "og:url", content: "https://busniss.org/news" },
    ],
    links: [{ rel: "canonical", href: "https://busniss.org/news" }],
  }),
  component: NewsPage,
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">{error.message}</div>,
});

const LIVE_CATEGORIES = ["live_event", "events"];
const NEWS_CATEGORIES = ["news", "press", "announcement"];

function iconFor(eventType: string | null, category: string) {
  if (eventType === "new_project") return <Rocket className="h-4 w-4" />;
  if (eventType === "marketplace_listing") return <Repeat className="h-4 w-4" />;
  if (eventType === "new_bid") return <Gavel className="h-4 w-4" />;
  if (eventType === "community_post") return <Megaphone className="h-4 w-4" />;
  if (category === "events" || category === "live_event") return <Radio className="h-4 w-4" />;
  return <Newspaper className="h-4 w-4" />;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`;
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

function NewsPage() {
  const qc = useQueryClient();
  const subscribe = useServerFn(subscribeNewsPublic);
  const { lang, dir } = useI18n();
  const isEn = lang === "en";
  const [email, setEmail] = useState("");

  const { data: liveItems, isLoading: liveLoading, isError: liveIsError, error: liveError, refetch: refetchLive } = useQuery({
    queryKey: ["news", "live"],
    queryFn: () => listArticles({ data: { limit: 60, categories: LIVE_CATEGORIES } }),
    refetchInterval: 30_000,
  });

  const { data: newsItems, isLoading: newsLoading, isError: newsIsError, error: newsError, refetch: refetchNews } = useQuery({
    queryKey: ["news", "feed"],
    queryFn: () => listArticles({ data: { limit: 30, categories: NEWS_CATEGORIES } }),
  });

  // Realtime: any new published article pushes both lists to refetch immediately.
  useEffect(() => {
    const ch = supabase
      .channel("public:articles:news")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "articles" },
        () => {
          qc.invalidateQueries({ queryKey: ["news", "live"] });
          qc.invalidateQueries({ queryKey: ["news", "feed"] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const subMut = useMutation({
    mutationFn: (e: string) => subscribe({ data: { email: e } }),
    onSuccess: (r: any) => {
      if (r?.already) toast.success("اشتراكك مُفعّل مسبقًا");
      else toast.success("تم إرسال رسالة تأكيد إلى بريدك — تحقّق منها لتفعيل الاشتراك.");
      setEmail("");
    },
    onError: (e: any) => toast.error(e?.message === "rate_limited" ? "محاولات كثيرة، حاول لاحقًا" : (e?.message || "تعذر الاشتراك")),
  });

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8" dir={dir}>
      <header className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 mb-3">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
          <span className="text-xs font-bold text-red-600 dark:text-red-400">بث مباشر</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">قناة أخبار IDEA BUSINESS</h1>
        <p className="text-muted-foreground">كل حدث على المنصة لحظة وقوعه — مشاريع جديدة، مزايدات، صفقات، وإعلانات.</p>
      </header>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-primary" /> اشترك في النشرة البريدية</CardTitle></CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (email.trim()) subMut.mutate(email.trim()); }}>
            <Input type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
            <Button type="submit" disabled={subMut.isPending}>{subMut.isPending ? "..." : "اشتراك"}</Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="live" className="gap-1"><Radio className="h-4 w-4" /> البث المباشر</TabsTrigger>
          <TabsTrigger value="news" className="gap-1"><Newspaper className="h-4 w-4" /> الأخبار</TabsTrigger>
          <TabsTrigger value="blog" asChild><Link to="/blog" className="flex items-center gap-1 justify-center"><BookOpen className="h-4 w-4" /> المدوّنة</Link></TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {liveLoading ? (
            <PageState
              kind="loading"
              title={isEn ? "Loading live updates" : "جارٍ تحميل البث المباشر"}
              description={isEn ? "New platform events will appear here." : "ستظهر أحداث المنصة الجديدة هنا."}
            />
          ) : liveIsError ? (
            <PageState
              kind="error"
              title={isEn ? "Live updates could not load" : "تعذّر تحميل البث المباشر"}
              description={(liveError as Error)?.message || (isEn ? "Try again in a moment." : "حاول مرة أخرى بعد لحظات.")}
              actionLabel={isEn ? "Reload updates" : "إعادة تحميل الأحداث"}
              onAction={() => refetchLive()}
            />
          ) : !liveItems?.length ? (
            <PageState
              kind="empty"
              title={isEn ? "No live events yet" : "لا توجد أحداث مباشرة بعد"}
              description={isEn ? "Projects, bids, deals, and announcements will appear here as soon as they happen." : "ستظهر المشاريع والمزايدات والصفقات والإعلانات هنا فور حدوثها."}
            />
          ) : (
            <ol className="relative border-r-2 border-border pr-6 space-y-4">
              {liveItems.map((a: any) => (
                <li key={a.id} className="relative">
                  <span className="absolute -right-[34px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    {iconFor(a.event_type, a.category)}
                  </span>
                  <Link to="/news/$slug" params={{ slug: a.slug }} className="block group">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{timeAgo(a.created_at)}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{a.event_type || a.category}</Badge>
                    </div>
                    <h3 className="font-semibold leading-snug group-hover:text-primary">{a.title}</h3>
                    {a.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          {newsLoading ? (
            <PageState
              kind="loading"
              title={isEn ? "Loading news" : "جارٍ تحميل الأخبار"}
              description={isEn ? "Preparing the latest edited updates." : "نجهّز آخر الأخبار المحررة."}
            />
          ) : newsIsError ? (
            <PageState
              kind="error"
              title={isEn ? "News could not load" : "تعذّر تحميل الأخبار"}
              description={(newsError as Error)?.message || (isEn ? "Try again in a moment." : "حاول مرة أخرى بعد لحظات.")}
              actionLabel={isEn ? "Reload news" : "إعادة تحميل الأخبار"}
              onAction={() => refetchNews()}
            />
          ) : !newsItems?.length ? (
            <PageState
              kind="empty"
              title={isEn ? "No edited news yet" : "لا توجد أخبار محررة بعد"}
              description={isEn ? "Published news and announcements will appear here." : "ستظهر الأخبار والإعلانات المنشورة هنا."}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {newsItems.map((a: any) => (
                <Link key={a.id} to="/news/$slug" params={{ slug: a.slug }} className="block group">
                  <Card className="h-full hover:border-primary transition-colors">
                    {a.cover_image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img src={a.cover_image_url} alt={a.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{a.category}</Badge>
                        {a.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> AI</Badge>}
                        <span className="text-xs text-muted-foreground mr-auto">{timeAgo(a.created_at)}</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
