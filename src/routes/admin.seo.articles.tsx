import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listSeoArticles, deleteSeoArticle, saveSeoArticle } from "@/lib/seo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo/articles")({
  component: ArticlesPage,
});

function ArticlesPage() {
  const list = useServerFn(listSeoArticles);
  const save = useServerFn(saveSeoArticle);
  const del = useServerFn(deleteSeoArticle);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", content: "", published: false });
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    setLoading(true);
    list({}).then((r) => { setItems(r.items); setLoading(false); });
  };
  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    if (!form.title || !form.slug || !form.content) return toast.error("املأ الحقول");
    setSaving(true);
    try {
      const r = await save({ data: { ...form, category: "blog", language: "ar", ai_generated: false } });
      if (!r.ok) toast.error(r.error || "فشل"); else { toast.success("تم"); setCreating(false); setForm({ title: "", slug: "", excerpt: "", content: "", published: false }); refresh(); }
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف نهائي؟")) return;
    const r = await del({ data: { id } });
    if (!r.ok) toast.error(r.error || "فشل"); else { toast.success("حُذف"); refresh(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> المقالات والمدوّنة</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/admin/seo/generator"><Plus className="h-4 w-4 ml-1" /> توليد AI</Link></Button>
          <Button onClick={() => setCreating(!creating)}><Plus className="h-4 w-4 ml-1" /> مقالة يدوية</Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">المقالات المنشورة تظهر مباشرةً في صفحة <Link to="/news" className="text-primary underline">الأخبار/المدوّنة</Link>، وتُضاف تلقائياً إلى السايتماب.</p>

      {creating && (
        <Card>
          <CardHeader><CardTitle>إنشاء مقالة جديدة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>العنوان</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Slug (أحرف صغيرة لاتينية وشرطات)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="my-article-slug" /></div>
            <div><Label>المقتطف</Label><Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
            <div><Label>المحتوى (Markdown)</Label><Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="font-mono text-xs" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> نشر فوراً</label>
            <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>كل المقالات ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-2">
              {items.map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b py-2 text-sm">
                  <div>
                    <div className="font-semibold">{a.title}</div>
                    <div className="text-xs text-muted-foreground flex gap-2 items-center">
                      /{a.slug} · {a.category} · {a.views_count} مشاهدة
                      {a.published ? <Badge>منشور</Badge> : <Badge variant="outline">مسودّة</Badge>}
                      {a.ai_generated && <Badge variant="secondary">AI</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" asChild><a href={`/news/${a.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد مقالات بعد. ابدأ بالمولّد الذكي.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
