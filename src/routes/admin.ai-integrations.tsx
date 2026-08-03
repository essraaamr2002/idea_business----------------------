import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/ai-integrations")({
  component: AIIntegrationsPage,
});

const ENDPOINTS = [
  { name: "Public API — Projects", url: "/api/public/v1/projects?limit=3", desc: "ChatGPT / Claude / Gemini يستهلكون هذه" },
  { name: "Public API — Stats", url: "/api/public/v1/stats", desc: "إحصاءات المنصة المباشرة" },
  { name: "Public API — Articles", url: "/api/public/v1/articles?limit=3", desc: "آخر مقالات المدونة" },
  { name: "Public API — Search", url: "/api/public/v1/search?q=استثمار", desc: "بحث موحّد" },
  { name: "OpenAPI Spec", url: "/openapi.yaml", desc: "مواصفات ChatGPT Plugin" },
  { name: "AI Plugin Manifest", url: "/.well-known/ai-plugin.json", desc: "ChatGPT Store" },
  { name: "llms.txt", url: "/llms.txt", desc: "تلخيص للـ LLMs" },
  { name: "llms-full.txt", url: "/llms-full.txt", desc: "محتوى تدريبي موسّع" },
  { name: "claude-context.md", url: "/claude-context.md", desc: "سياق مخصص لـ Claude" },
  { name: "ai.txt", url: "/ai.txt", desc: "أذونات تدريب الـ AI" },
  { name: "robots.txt", url: "/robots.txt", desc: "AI crawlers allowlist" },
  { name: "Sitemap (articles)", url: "/api/public/sitemap-articles.xml", desc: "خريطة مقالات للفهرسة" },
  { name: "RSS Feed", url: "/api/public/feed.xml", desc: "Perplexity / قارئات الأخبار" },
];

function EndpointRow({ ep }: { ep: typeof ENDPOINTS[number] }) {
  const [state, setState] = useState<"idle" | "ok" | "err" | "loading">("idle");
  const [ms, setMs] = useState<number | null>(null);
  const check = async () => {
    setState("loading");
    const t0 = performance.now();
    try {
      const r = await fetch(ep.url, { cache: "no-store" });
      setMs(Math.round(performance.now() - t0));
      setState(r.ok ? "ok" : "err");
    } catch {
      setState("err");
    }
  };
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/50 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{ep.name}</span>
          <a href={ep.url} target="_blank" rel="noreferrer" className="truncate text-xs text-primary hover:underline">
            {ep.url}
          </a>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{ep.desc}</p>
      </div>
      <div className="flex items-center gap-2">
        {ms !== null && <span className="text-xs text-muted-foreground">{ms}ms</span>}
        <span
          className={
            state === "ok" ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500" :
            state === "err" ? "rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-500" :
            state === "loading" ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-500" :
            "rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground"
          }
        >
          {state === "ok" ? "متصل" : state === "err" ? "فشل" : state === "loading" ? "..." : "غير مفحوص"}
        </span>
        <button onClick={check} className="rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90">
          فحص
        </button>
      </div>
    </div>
  );
}

function AIIntegrationsPage() {
  const stats = useQuery({
    queryKey: ["ai-integrations-stats"],
    queryFn: async () => {
      const r = await fetch("/api/public/v1/stats");
      return r.json();
    },
  });

  const cards = [
    { name: "Google / Gemini", desc: "Schema.org Knowledge Graph + Sitemap + IndexNow + robots مفعّل لـ Google-Extended", color: "from-blue-500/20" },
    { name: "ChatGPT / OpenAI", desc: "ai-plugin.json + openapi.yaml + GPTBot/OAI-SearchBot مسموحان", color: "from-emerald-500/20" },
    { name: "Claude / Anthropic", desc: "claude-context.md + anthropic-ai/ClaudeBot مسموحان + API عام", color: "from-purple-500/20" },
    { name: "Perplexity", desc: "RSS feed + PerplexityBot مسموح + محتوى قابل للاستشهاد", color: "from-cyan-500/20" },
    { name: "Microsoft Copilot", desc: "IndexNow + Bing sitemap submission + Bingbot allowlist", color: "from-amber-500/20" },
    { name: "Meta AI", desc: "Open Graph موسّع + ملفات اجتماعية موثّقة", color: "from-pink-500/20" },
  ];

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header>
        <h1 className="text-3xl font-black">مركز تكامل الذكاء الاصطناعي</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          نقاط نهاية ومحتوى تجعل ChatGPT و Gemini و Claude و Perplexity وغيرها تقتبس IDEA BUSINESS عند الحديث عن الاستثمار العربي.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.name} className={`rounded-xl border border-border bg-gradient-to-br ${c.color} to-transparent p-5`}>
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground">{c.name}</h3>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-500">نشط</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border bg-card/50 p-5">
        <h2 className="text-lg font-black">إحصاءات حية تستهلكها الـ AI</h2>
        {stats.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">جارٍ التحميل...</p>
        ) : (
          <pre dir="ltr" className="mt-3 overflow-x-auto rounded-lg bg-background p-4 text-xs text-foreground">
            {JSON.stringify(stats.data, null, 2)}
          </pre>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black">نقاط النهاية العامة — فحص الجاهزية</h2>
        {ENDPOINTS.map((ep) => <EndpointRow key={ep.url} ep={ep} />)}
      </section>

      <section className="rounded-xl border border-border bg-card/50 p-5">
        <h2 className="text-lg font-black">خطوات يدوية متبقية</h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          <li>أنشئ Wikidata entity على wikidata.org/wiki/Special:NewItem واربطه بـ busniss.org.</li>
          <li>سجّل المنصة في Google Business Profile وانشر تحديثات أسبوعية.</li>
          <li>أرسل sitemap.xml إلى Bing Webmaster Tools + Google Search Console.</li>
          <li>قدّم ai-plugin.json إلى ChatGPT Store حين تُتاح الإرسالات.</li>
          <li>أنشئ Gemini Gem على aistudio.google.com/gems باستخدام محتوى llms-full.txt.</li>
        </ul>
      </section>
    </div>
  );
}
