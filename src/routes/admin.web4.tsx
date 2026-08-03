import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { adminListWeb4Activations, adminListWeb4Audit } from '@/lib/web4.functions'
import { CheckCircle2, XCircle, Radio, RefreshCw, Mic, MapPin } from 'lucide-react'

export const Route = createFileRoute('/admin/web4')({
  head: () => ({ meta: [
    { title: 'لوحة Web4 — الإدارة | IDEA BUSINESS' },
    { name: 'robots', content: 'noindex, nofollow' },
  ]}),
  component: AdminWeb4,
})

function AdminWeb4() {
  const [userQuery, setUserQuery] = useState('')
  const [days, setDays] = useState('30')

  const activations = useQuery({
    queryKey: ['admin-web4-activations', userQuery, days],
    queryFn: () => adminListWeb4Activations({ data: { userQuery: userQuery || null, days: Number(days), limit: 200 } }),
  })
  const audit = useQuery({
    queryKey: ['admin-web4-audit', days],
    queryFn: () => adminListWeb4Audit({ data: { days: Math.min(Number(days), 30), limit: 500 } }),
  })

  const rows = activations.data?.rows ?? []
  const audits = audit.data?.rows ?? []

  const totals = {
    total: rows.length,
    active: rows.filter((r: any) => r.activated).length,
    withMic: rows.filter((r: any) => r.mic_granted).length,
    withGeo: rows.filter((r: any) => r.geo_granted).length,
    broadcasting: rows.filter((r: any) => r.broadcast_agents).length,
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">لوحة Web4 — تجربة 14D</h1>
          <p className="text-sm text-muted-foreground">حالة تفعيل الأعضاء، أذوناتهم، ومشاركتهم مع الوكلاء الستة.</p>
        </div>
        <Button variant="outline" onClick={() => { activations.refetch(); audit.refetch() }}>
          <RefreshCw className="w-4 h-4 me-2" /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="إجمالي المسجّلين" value={totals.total} />
        <Stat label="مفعّلون بالكامل" value={totals.active} tone="ok" />
        <Stat label="ميكروفون ممنوح" value={totals.withMic} />
        <Stat label="موقع ممنوح" value={totals.withGeo} />
        <Stat label="يبثّون للوكلاء" value={totals.broadcasting} tone="ok" />
      </div>

      <Card>
        <CardHeader><CardTitle>الفلاتر</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-64">
            <label className="text-xs text-muted-foreground">بحث عن عضو (اسم / بريد / UUID)</label>
            <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="ابحث..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">المدة</label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">آخر يوم</SelectItem>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوماً</SelectItem>
                <SelectItem value="90">آخر 90 يوماً</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>حالة الأعضاء</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right p-3">العضو</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">الأذونات</th>
                  <th className="text-right p-3">مشاركة مع الوكلاء</th>
                  <th className="text-right p-3">وقت التفعيل</th>
                </tr>
              </thead>
              <tbody>
                {activations.isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={5}>جارٍ التحميل...</td></tr>}
                {!activations.isLoading && rows.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={5}>لا نتائج ضمن الفلتر الحالي.</td></tr>}
                {rows.map((r: any) => (
                  <tr key={r.user_id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{r.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.email || r.user_id}</div>
                    </td>
                    <td className="p-3">
                      {r.activated
                        ? <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40"><CheckCircle2 className="w-3 h-3 me-1" /> مفعّل</Badge>
                        : <Badge variant="outline">جزئي / موقوف</Badge>}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        <PermChip icon={Mic} ok={r.mic_granted} />
                        <PermChip icon={MapPin} ok={r.geo_granted} />
                      </div>
                    </td>
                    <td className="p-3">
                      {r.broadcast_agents
                        ? <Badge className="bg-primary/15 text-primary border-primary/30"><Radio className="w-3 h-3 me-1" /> 6 وكلاء</Badge>
                        : <Badge variant="outline">—</Badge>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {r.updated_at ? new Date(r.updated_at).toLocaleString('ar') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>سجل التدقيق (أحدث المحاولات)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right p-3">الوقت</th>
                  <th className="text-right p-3">العضو</th>
                  <th className="text-right p-3">النتيجة</th>
                  <th className="text-right p-3">Mic</th>
                  <th className="text-right p-3">Geo</th>
                  <th className="text-right p-3">بثّ الوكلاء</th>
                  <th className="text-right p-3">خطأ</th>
                </tr>
              </thead>
              <tbody>
                {audit.isLoading && <tr><td className="p-4 text-muted-foreground" colSpan={7}>جارٍ التحميل...</td></tr>}
                {!audit.isLoading && audits.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={7}>لا محاولات ضمن الفترة.</td></tr>}
                {audits.map((a: any) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3 text-xs font-mono">{new Date(a.created_at).toLocaleString('ar')}</td>
                    <td className="p-3 text-xs font-mono">{a.user_id?.slice(0, 8) ?? '—'}</td>
                    <td className="p-3"><OutcomeBadge o={a.outcome} /></td>
                    <td className="p-3 text-xs">{a.mic_state ?? '—'}</td>
                    <td className="p-3 text-xs">{a.geo_state ?? '—'}</td>
                    <td className="p-3">{a.broadcast_agents ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}</td>
                    <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{a.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone === 'ok' ? 'text-emerald-600' : ''}`}>{value}</div>
    </CardContent></Card>
  )
}

function PermChip({ icon: Icon, ok }: { icon: any; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${ok ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40' : 'bg-muted text-muted-foreground'}`}>
      <Icon className="w-3 h-3" /> {ok ? 'ON' : 'OFF'}
    </span>
  )
}

function OutcomeBadge({ o }: { o: string }) {
  const m: Record<string, string> = {
    accepted: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40',
    verified: 'bg-primary/20 text-primary border-primary/40',
    partial: 'bg-amber-500/20 text-amber-700 border-amber-500/40',
    denied: 'bg-red-500/20 text-red-700 border-red-500/40',
    error: 'bg-red-500/20 text-red-700 border-red-500/40',
  }
  return <Badge className={m[o] ?? ''}>{o}</Badge>
}
