import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { listFutureLabHistory, deleteFutureLabResult } from '@/lib/future-lab-history.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, Sparkles, Clock, Bot, Mic, Link as LinkIcon } from 'lucide-react';
import { PdfExportButton } from '@/components/PdfExportButton';

export const Route = createFileRoute('/_authenticated/future-lab/history')({
  head: () => ({ meta: [{ title: 'سجل مختبر المستقبل | IDEA BUSINESS' }] }),
  component: FutureLabHistoryPage,
});

const toolMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  oracle: { label: 'الأوراكل', icon: Sparkles },
  time_machine: { label: 'آلة الزمن', icon: Clock },
  twin: { label: 'التوأم الرقمي', icon: Bot },
  voice_trader: { label: 'التداول الصوتي', icon: Mic },
  trust_chain: { label: 'سلسلة الثقة', icon: LinkIcon },
};

function FutureLabHistoryPage() {
  const list = useServerFn(listFutureLabHistory);
  const del = useServerFn(deleteFutureLabResult);
  type Row = { id: string; tool: string; title: string; summary: string | null; payload: Record<string, unknown>; created_at: string };
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [tool, setTool] = useState<string>('');

  async function refresh() {
    const r = await list({
      data: {
        q: q || undefined,
        tool: (tool || undefined) as never,
        limit: 100,
      },
    });
    setItems(r.items as Row[]);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">سجل نتائج مختبر المستقبل</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>بحث وتصفية</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث في العناوين…" className="pr-9" />
          </div>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value)}
            className="border rounded-md px-3 bg-background text-sm"
          >
            <option value="">كل الأدوات</option>
            {Object.entries(toolMeta).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <Button onClick={refresh}>بحث</Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {items.length === 0 && <p className="text-muted-foreground text-center py-8">لا توجد نتائج محفوظة بعد.</p>}
        {items.map((it) => {
          const Meta = toolMeta[it.tool] ?? toolMeta.oracle;
          const Icon = Meta.icon;
          return (
            <Card key={it.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-primary" />
                    <Badge variant="outline">{Meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-semibold truncate">{it.title}</h3>
                  {it.summary && <p className="text-sm text-muted-foreground mt-1">{it.summary}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <PdfExportButton
                    title={it.title}
                    subtitle={`${Meta.label} — ${new Date(it.created_at).toLocaleString()}`}
                    filename={`${it.tool}-${it.id.slice(0, 8)}.pdf`}
                    sections={[
                      { heading: 'الملخّص', body: it.summary ?? '—' },
                      { heading: 'البيانات', body: JSON.stringify(it.payload, null, 2) },
                    ]}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await del({ data: { id: it.id } });
                      void refresh();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
