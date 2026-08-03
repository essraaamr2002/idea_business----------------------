import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { runSecurityReport } from '@/lib/security-report.functions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PdfExportButton } from '@/components/PdfExportButton';
import { Shield, PlayCircle, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/security-report')({
  head: () => ({ meta: [{ title: 'تقرير الفحص الأمني | IDEA BUSINESS' }] }),
  component: SecurityReportPage,
});

type Report = Awaited<ReturnType<typeof runSecurityReport>>;

function SecurityReportPage() {
  const run = useServerFn(runSecurityReport);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setErr(null);
    try {
      const r = await run();
      setReport(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'فشل الفحص');
    } finally {
      setLoading(false);
    }
  }

  const pdfSections = report
    ? [
        {
          heading: 'ملخّص RLS',
          body: report.rls_probe
            .map((r) => `${r.reachable ? '✓' : '✗'} ${r.table}${r.error ? ` — ${r.error}` : ''}`)
            .join('\n'),
        },
        {
          heading: 'التكاملات',
          body: report.integrations.map((i) => `${i.ok ? '✓' : '✗'} ${i.name}`).join('\n'),
        },
        {
          heading: 'آخر أحداث الأمان',
          body:
            report.recent_events
              .map((e) => `[${e.severity}] ${e.event_type} — ${new Date(e.created_at).toLocaleString()}`)
              .join('\n') || 'لا يوجد',
        },
      ]
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">تقرير الفحص الأمني</h1>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin">
            <ArrowLeft className="w-4 h-4 ml-1" />
            العودة
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تشغيل فحص جديد</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={handleRun} disabled={loading}>
            <PlayCircle className="w-4 h-4 ml-2" />
            {loading ? 'يجري الفحص…' : 'تشغيل الفحص الآن'}
          </Button>
          {report && (
            <PdfExportButton
              title="تقرير الفحص الأمني"
              subtitle={`أُنشئ في ${new Date(report.generated_at).toLocaleString()}`}
              sections={pdfSections}
              filename="security-report.pdf"
            />
          )}
        </CardContent>
      </Card>

      {err && <p className="text-destructive text-sm">{err}</p>}

      {report && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>تغطية RLS ({report.rls_probe.filter((r) => r.reachable).length}/{report.rls_probe.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right border-b">
                    <th className="p-2">الجدول</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">تفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rls_probe.map((r) => (
                    <tr key={r.table} className="border-b">
                      <td className="p-2 font-mono">{r.table}</td>
                      <td className="p-2">
                        <Badge variant={r.reachable ? 'default' : 'destructive'}>
                          {r.reachable ? 'متاح' : 'محجوب'}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">{r.error ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التكاملات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.integrations.map((i) => (
                <div key={i.name} className="flex items-center justify-between text-sm">
                  <span>{i.name}</span>
                  <Badge variant={i.ok ? 'default' : 'destructive'}>{i.ok ? 'متصل' : 'فشل'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>آخر أحداث الأمان</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {report.recent_events.length === 0 && <p className="text-muted-foreground">لا توجد أحداث حديثة.</p>}
              {report.recent_events.map((e) => (
                <div key={e.id} className="border-b py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{e.event_type}</span>
                    <Badge variant="outline">{e.severity}</Badge>
                  </div>
                  <div className="text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString()}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
