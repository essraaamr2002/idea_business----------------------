import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, Trash2, Download, Search } from "lucide-react";

export const Route = createFileRoute("/admin/seo/keywords")({ component: Page });

type KW = { id: string; keyword: string; volume: number; difficulty: number; position: number; targetUrl: string; intent: string; createdAt: number };
const KEY = "seo:keywords:v1";

const SEED: KW[] = [
  { id: "1", keyword: "منصة استثمار أفكار", volume: 1900, difficulty: 42, position: 3, targetUrl: "/", intent: "commercial", createdAt: Date.now() },
  { id: "2", keyword: "بيع IDEA BUSINESS", volume: 880, difficulty: 28, position: 8, targetUrl: "/projects", intent: "transactional", createdAt: Date.now() },
  { id: "3", keyword: "كيف أبدأ مشروع", volume: 4400, difficulty: 35, position: 14, targetUrl: "/blog", intent: "informational", createdAt: Date.now() },
];

function Page() {
  const [items, setItems] = useState<KW[]>(SEED);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ keyword: "", volume: 0, difficulty: 0, position: 0, targetUrl: "", intent: "informational" });

  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v) setItems(JSON.parse(v)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }, [items]);

  const add = () => { if (!form.keyword.trim()) return; setItems([{ id: Date.now().toString(), ...form, createdAt: Date.now() }, ...items]); setForm({ keyword: "", volume: 0, difficulty: 0, position: 0, targetUrl: "", intent: "informational" }); };
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id));

  const filtered = useMemo(() => items.filter((i) => i.keyword.includes(q) || i.targetUrl.includes(q)), [items, q]);
  const stats = { total: items.length, top3: items.filter((i) => i.position > 0 && i.position <= 3).length, top10: items.filter((i) => i.position > 0 && i.position <= 10).length, untracked: items.filter((i) => i.position === 0).length };
  const csv = "keyword,volume,difficulty,position,targetUrl,intent\n" + items.map((i) => `"${i.keyword}",${i.volume},${i.difficulty},${i.position},"${i.targetUrl}",${i.intent}`).join("\n");

  return (
    <div dir="rtl" className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6" /> قائمة الكلمات المستهدفة</h1>
        <p className="text-sm text-muted-foreground mt-1">تتبّع الكلمات الرئيسية، مواضعها في Google، والصفحات الهدف.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي</div><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Top 3</div><div className="text-3xl font-bold text-emerald-600">{stats.top3}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Top 10</div><div className="text-3xl font-bold text-blue-600">{stats.top10}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">غير متتبَّع</div><div className="text-3xl font-bold text-muted-foreground">{stats.untracked}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>إضافة كلمة</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-2 items-end">
          <div className="md:col-span-2"><Label>الكلمة</Label><Input value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} /></div>
          <div><Label>حجم البحث</Label><Input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })} /></div>
          <div><Label>الصعوبة</Label><Input type="number" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })} /></div>
          <div><Label>الموضع</Label><Input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div>
          <Button onClick={add}><Plus className="h-4 w-4 ml-1" /> إضافة</Button>
          <div className="md:col-span-3"><Label>URL هدف</Label><Input value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} placeholder="/path" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>الكلمات ({filtered.length})</CardTitle>
          <div className="flex gap-2 items-center">
            <div className="relative"><Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className="pr-8 w-48" /></div>
            <Button size="sm" variant="outline" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "keywords.csv"; a.click(); }}><Download className="h-4 w-4 ml-1" /> CSV</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div className="grid grid-cols-[2fr_70px_70px_70px_1.5fr_80px_40px] gap-2 text-xs font-semibold text-muted-foreground border-b pb-2">
              <div>الكلمة</div><div>الحجم</div><div>الصعوبة</div><div>الموضع</div><div>URL</div><div>النية</div><div></div>
            </div>
            {filtered.map((i) => (
              <div key={i.id} className="grid grid-cols-[2fr_70px_70px_70px_1.5fr_80px_40px] gap-2 items-center py-2 border-b">
                <div className="font-medium">{i.keyword}</div>
                <div>{i.volume.toLocaleString()}</div>
                <div><Badge variant={i.difficulty > 60 ? "destructive" : i.difficulty > 30 ? "secondary" : "default"}>{i.difficulty}</Badge></div>
                <div>{i.position > 0 ? <Badge variant={i.position <= 3 ? "default" : i.position <= 10 ? "secondary" : "outline"}>#{i.position}</Badge> : "—"}</div>
                <div className="text-xs font-mono truncate">{i.targetUrl || "—"}</div>
                <div className="text-xs">{i.intent}</div>
                <Button variant="ghost" size="icon" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-6">لا توجد كلمات.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
