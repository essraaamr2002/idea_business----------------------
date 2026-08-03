import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileCode, RefreshCw, ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo/sitemap")({ component: Page });

function Page() {
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>("");

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/sitemap.xml", { cache: "no-store" });
      const txt = await r.text();
      const matches = Array.from(txt.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
      setUrls(matches); setFetchedAt(new Date().toLocaleString("ar"));
    } catch (e: any) { setError(e?.message ?? "فشل التحميل"); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const byKind: Record<string, number> = {};
  urls.forEach((u) => { const k = (u.match(/\/(projects|news|blog|community|market|membership|admin)/)?.[1] ?? "other"); byKind[k] = (byKind[k] ?? 0) + 1; });

  return (
    <div dir="rtl" className="space-y-4 max-w-5xl">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileCode className="h-6 w-6" /> Sitemap</h1>
          <p className="text-sm text-muted-foreground mt-1">إحصاءات ومراقبة ملف السايتماب الحيّ — يُحدّث تلقائياً من /sitemap.xml.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 ml-1" /> تحديث</Button>
          <Button size="sm" asChild><a href="/sitemap.xml" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 ml-1" /> فتح XML</a></Button>
        </div>
      </div>

      {error && <Card className="border-destructive"><CardContent className="p-4 text-sm text-destructive">{error}</CardContent></Card>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي الروابط</div><div className="text-3xl font-bold mt-1">{loading ? "…" : urls.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مشاريع</div><div className="text-3xl font-bold mt-1">{byKind.projects ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">مقالات</div><div className="text-3xl font-bold mt-1">{(byKind.news ?? 0) + (byKind.blog ?? 0)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">آخر فحص</div><div className="text-sm font-semibold mt-1">{fetchedAt || "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>الإرسال لمحركات البحث</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><a target="_blank" rel="noreferrer" href="https://search.google.com/search-console/sitemaps"><Send className="h-4 w-4 ml-1" /> Google Search Console</a></Button>
          <Button variant="outline" size="sm" asChild><a target="_blank" rel="noreferrer" href="https://www.bing.com/webmasters/sitemaps"><Send className="h-4 w-4 ml-1" /> Bing Webmaster</a></Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${location.origin}/sitemap.xml`); toast.success("تم نسخ رابط السايتماب"); }}>نسخ الرابط</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الروابط ({urls.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="max-h-[480px] overflow-auto divide-y text-sm">
              {urls.map((u) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 hover:bg-muted/40 px-2 font-mono text-xs truncate">
                  <Badge variant="outline" className="shrink-0">{(u.match(/\/(projects|news|blog|community|market|membership)/)?.[1] ?? "page")}</Badge>
                  <span className="truncate">{u}</span>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
