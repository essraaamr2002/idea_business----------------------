import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateSeoArticle, saveSeoArticle } from "@/lib/seo.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo/generator")({
  component: Generator,
});

function Generator() {
  const gen = useServerFn(generateSeoArticle);
  const save = useServerFn(saveSeoArticle);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [tone, setTone] = useState<"professional" | "casual" | "expert" | "marketing">("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!topic.trim()) return toast.error("أدخل الموضوع");
    setLoading(true);
    try {
      const r = await gen({ data: { topic, keywords, tone, length, language: lang, model } });
      if (!r.ok) toast.error(r.error || "فشل التوليد");
      else { setResult(r.article); toast.success("تم التوليد"); }
    } finally { setLoading(false); }
  };

  const publish = async (published: boolean) => {
    if (!result) return;
    setSaving(true);
    try {
      const r = await save({ data: {
        title: result.title,
        slug: result.slug,
        excerpt: result.excerpt,
        content: result.content_markdown,
        category: "blog",
        language: lang,
        published,
        ai_generated: true,
      }});
      if (!r.ok) toast.error(r.error || "فشل الحفظ");
      else toast.success(published ? "تم النشر في المدوّنة/الأخبار" : "تم الحفظ كمسودّة");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> مولّد محتوى SEO بالذكاء الاصطناعي</h1>
      <p className="text-sm text-muted-foreground">يستخدم بوابة Lovable AI (Gemini / GPT / Claude). اختر النموذج المناسب.</p>

      <Card>
        <CardHeader><CardTitle>إعدادات التوليد</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>الموضوع</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثلاً: كيف تختار شريك تأسيس مشروعك؟" />
          </div>
          <div>
            <Label>كلمات مفتاحية مستهدفة (اختياري)</Label>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="شريك تأسيس، عقد الشراكة، اتفاقية المؤسسين" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>النبرة</Label>
              <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">احترافية</SelectItem>
                  <SelectItem value="expert">خبير</SelectItem>
                  <SelectItem value="marketing">تسويقية</SelectItem>
                  <SelectItem value="casual">ودّية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الطول</Label>
              <Select value={length} onValueChange={(v: any) => setLength(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short">قصير</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="long">طويل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>اللغة</Label>
              <Select value={lang} onValueChange={(v: any) => setLang(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>النموذج</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini Flash (سريع)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini Pro</SelectItem>
                  <SelectItem value="google/gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (قوي)</SelectItem>
                  <SelectItem value="openai/gpt-5.5">GPT-5.5 (Best)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={run} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> جارٍ التوليد…</> : <><Sparkles className="h-4 w-4 ml-2" /> توليد المقالة</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">slug: {result.slug} · meta-title: {result.meta_title?.length || 0} ch</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Meta Description</Label>
              <Textarea value={result.meta_description} onChange={(e) => setResult({ ...result, meta_description: e.target.value })} />
            </div>
            <div>
              <Label>المقتطف (excerpt)</Label>
              <Textarea value={result.excerpt} onChange={(e) => setResult({ ...result, excerpt: e.target.value })} />
            </div>
            <div>
              <Label>المحتوى (Markdown)</Label>
              <Textarea rows={20} value={result.content_markdown} onChange={(e) => setResult({ ...result, content_markdown: e.target.value })} className="font-mono text-xs" />
            </div>
            {result.faq?.length > 0 && (
              <div className="text-sm">
                <strong>الأسئلة الشائعة المُقترحة:</strong>
                <ul className="list-disc pr-4 mt-1 space-y-1">
                  {result.faq.map((f: any, i: number) => <li key={i}><b>{f.q}</b> — {f.a}</li>)}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => publish(false)} disabled={saving} variant="outline"><Save className="h-4 w-4 ml-2" /> حفظ كمسودّة</Button>
              <Button onClick={() => publish(true)} disabled={saving}><Save className="h-4 w-4 ml-2" /> نشر في المدوّنة/الأخبار</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
