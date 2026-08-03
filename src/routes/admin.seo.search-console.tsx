import { createFileRoute } from "@tanstack/react-router";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/seo/search-console")({ component: Page });

function Page() {
  const props = ["https://busniss.org/", "https://www.busniss.org/"];
  return (
    <AdminPageShell title="Google Search Console" description="إدارة الفهرسة والأداء على Google" icon={Search} badge="GSC">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/>التحقق من الموقع</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
          <p>الموقع متحقق منه على Google عبر meta-tag في الـ root.</p>
          <ul className="list-disc pr-5 space-y-1 text-xs text-muted-foreground">
            {props.map(p => <li key={p} className="font-mono">{p}</li>)}
          </ul>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">روابط سريعة</CardTitle></CardHeader><CardContent className="space-y-2">
          {[
            ["لوحة Search Console","https://search.google.com/search-console"],
            ["فحص URL","https://search.google.com/search-console/inspect"],
            ["خريطة الموقع","https://search.google.com/search-console/sitemaps"],
            ["تقرير الأداء","https://search.google.com/search-console/performance/search-analytics"],
          ].map(([l,u]) => (
            <a key={u} href={u} target="_blank" rel="noopener" className="flex items-center justify-between p-2 rounded border hover:bg-muted text-sm">
              <span>{l}</span><ExternalLink className="h-4 w-4 text-muted-foreground"/>
            </a>
          ))}
        </CardContent></Card>
      </div>
      <Card className="mt-4"><CardHeader><CardTitle className="text-sm">إرسال خريطة الموقع</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
        <p>أرسل <code className="bg-muted px-1.5 py-0.5 rounded text-xs">https://busniss.org/sitemap.xml</code> من شاشة Sitemaps في GSC.</p>
        <a href="https://search.google.com/search-console/sitemaps" target="_blank" rel="noopener"><Button size="sm"><ExternalLink className="h-4 w-4 ml-1"/>فتح Sitemaps</Button></a>
      </CardContent></Card>
    </AdminPageShell>
  );
}
