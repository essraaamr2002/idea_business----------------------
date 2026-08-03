import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listPages, upsertPage, listBanners, upsertBanner } from "@/lib/admin-pro.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cms")({ component: Page });

function Page() {
  const lp = useServerFn(listPages);
  const up = useServerFn(upsertPage);
  const lb = useServerFn(listBanners);
  const ub = useServerFn(upsertBanner);
  const qc = useQueryClient();
  const { data: pages = [] } = useQuery({ queryKey: ["cms-pages"], queryFn: () => lp() });
  const { data: banners = [] } = useQuery({ queryKey: ["cms-banners"], queryFn: () => lb() });
  const savePage = useMutation({ mutationFn: (d: any) => up(d), onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["cms-pages"] }); } });
  const saveBanner = useMutation({ mutationFn: (d: any) => ub(d), onSuccess: () => { toast.success("تم"); qc.invalidateQueries({ queryKey: ["cms-banners"] }); } });

  const [page, setPage] = useState<any>({ slug: "", title: "", content: { body: "" }, is_published: true });
  const [banner, setBanner] = useState<any>({ placement: "home_top", title: "", image_url: "", link_url: "", is_active: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">مدير المحتوى (CMS)</h1>
          <p className="text-sm text-muted-foreground">صفحات وبنرات قابلة للتحرير بدون كود.</p>
        </div>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages">الصفحات ({pages.length})</TabsTrigger>
          <TabsTrigger value="banners"><ImageIcon className="h-4 w-4 mr-1" /> البنرات ({banners.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">صفحة جديدة / تعديل</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>المعرف (slug)</Label><Input value={page.slug} onChange={(e) => setPage({ ...page, slug: e.target.value })} placeholder="about-us" /></div>
                <div><Label>العنوان</Label><Input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} /></div>
              </div>
              <div><Label>المحتوى</Label><Textarea rows={6} value={page.content?.body ?? ""} onChange={(e) => setPage({ ...page, content: { body: e.target.value } })} /></div>
              <div className="flex items-center gap-2"><Switch checked={page.is_published} onCheckedChange={(v) => setPage({ ...page, is_published: v })} /> منشور</div>
              <Button onClick={() => savePage.mutate(page)}><Plus className="h-4 w-4 mr-1" /> حفظ</Button>
            </CardContent>
          </Card>
          <div className="grid gap-2">
            {(pages as any[]).map((p) => (
              <Card key={p.id}><CardContent className="p-3 flex items-center justify-between cursor-pointer" onClick={() => setPage(p)}>
                <div><div className="font-semibold">{p.title}</div><div className="text-xs text-muted-foreground font-mono">/{p.slug}</div></div>
                <Badge variant={p.is_published ? "default" : "secondary"}>{p.is_published ? "منشور" : "مسودة"}</Badge>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="banners" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">بنر جديد</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>الموضع</Label><Input value={banner.placement} onChange={(e) => setBanner({ ...banner, placement: e.target.value })} placeholder="home_top" /></div>
                <div><Label>العنوان</Label><Input value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} /></div>
              </div>
              <div><Label>رابط الصورة</Label><Input value={banner.image_url} onChange={(e) => setBanner({ ...banner, image_url: e.target.value })} /></div>
              <div><Label>رابط الانتقال</Label><Input value={banner.link_url} onChange={(e) => setBanner({ ...banner, link_url: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={banner.is_active} onCheckedChange={(v) => setBanner({ ...banner, is_active: v })} /> نشط</div>
              <Button onClick={() => saveBanner.mutate(banner)}>حفظ</Button>
            </CardContent>
          </Card>
          <div className="grid gap-2 md:grid-cols-2">
            {(banners as any[]).map((b) => (
              <Card key={b.id}><CardContent className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setBanner(b)}>
                {b.image_url ? <img src={b.image_url} className="h-12 w-20 object-cover rounded" /> : <div className="h-12 w-20 bg-muted rounded" />}
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{b.title ?? b.placement}</div><div className="text-xs text-muted-foreground">{b.placement}</div></div>
                <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "نشط" : "معطّل"}</Badge>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
