import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { smCreateListing, smOpenAccount } from '@/lib/market.functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_authenticated/market/new')({
  head: () => ({ meta: [{ title: 'طرح مشروع في السوق الموازي' }] }),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">غير موجود</div>,
  component: NewListingPage,
})

function NewListingPage() {
  const nav = useNavigate()
  const open = useServerFn(smOpenAccount)
  const create = useServerFn(smCreateListing)
  const [stage, setStage] = useState<'idea' | 'project'>('idea')
  const [form, setForm] = useState({ name: '', total_shares: 10000, collateral_value: 0, annual_revenue: 0, solvency_score: 50, initial_price: 1 })
  const [busy, setBusy] = useState(false)

  useEffect(() => { open().catch(() => {}) }, [])

  async function submit() {
    setBusy(true)
    try {
      const res = await create({ data: {
        name: form.name,
        stage,
        total_shares: Math.floor(form.total_shares / 100) * 100,
        collateral_value: Number(form.collateral_value),
        annual_revenue: stage === 'project' ? Number(form.annual_revenue) : null,
        solvency_score: Number(form.solvency_score),
        initial_price: Number(form.initial_price),
      }})
      toast.success('تم إنشاء الإدراج — بانتظار المراجعة')
      nav({ to: '/market' })
    } catch (e: any) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  // معاينة الحسبة
  const platformShares = Math.floor(form.total_shares * 8 / 100)
  const founderShares = form.total_shares - platformShares
  const estValuation = stage === 'idea'
    ? form.collateral_value * 1.2 + form.solvency_score * 1000
    : form.annual_revenue * 5 + form.collateral_value * 1.2 + form.solvency_score * 2000
  const capPrice = form.total_shares > 0 ? estValuation / form.total_shares : 0

  return (
    <div className="container mx-auto py-6 max-w-3xl" dir="rtl">
      <Card>
        <CardHeader><CardTitle>طرح مشروع/فكرة في السوق الموازي</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={stage} onValueChange={(v) => setStage(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="idea">فكرة</TabsTrigger>
              <TabsTrigger value="project">مشروع قائم</TabsTrigger>
            </TabsList>
          </Tabs>

          <div>
            <Label>الاسم</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>إجمالي الأسهم</Label>
              <Input type="number" value={form.total_shares} onChange={(e) => setForm({ ...form, total_shares: Number(e.target.value) })} />
            </div>
            <div>
              <Label>السعر الابتدائي (ر.س)</Label>
              <Input type="number" step="0.01" value={form.initial_price} onChange={(e) => setForm({ ...form, initial_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>قيمة الضمانات (ر.س)</Label>
              <Input type="number" value={form.collateral_value} onChange={(e) => setForm({ ...form, collateral_value: Number(e.target.value) })} />
            </div>
            {stage === 'project' && (
              <div>
                <Label>الإيراد السنوي (ر.س)</Label>
                <Input type="number" value={form.annual_revenue} onChange={(e) => setForm({ ...form, annual_revenue: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <Label>درجة الملاءة (0-100)</Label>
              <Input type="number" min={0} max={100} value={form.solvency_score} onChange={(e) => setForm({ ...form, solvency_score: Number(e.target.value) })} />
            </div>
          </div>

          <div className="bg-muted/40 rounded-md p-4 space-y-2 text-sm">
            <div className="font-semibold">معاينة الحسبة</div>
            <div className="flex justify-between"><span>حصة المنصة (8% مجاناً)</span><span className="font-mono">{platformShares.toLocaleString()} سهم</span></div>
            <div className="flex justify-between"><span>حصة المؤسس (92%)</span><span className="font-mono">{founderShares.toLocaleString()} سهم</span></div>
            <div className="flex justify-between"><span>التقييم الأقصى</span><span className="font-mono">{estValuation.toLocaleString()} ر.س</span></div>
            <div className="flex justify-between"><span>سقف السعر/سهم</span><span className="font-mono">{capPrice.toFixed(4)} ر.س</span></div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              📐 صيغة التقييم: {stage === 'idea'
                ? '(ضمانات × 1.2) + (ملاءة × 1000)'
                : '(إيراد × 5) + (ضمانات × 1.2) + (ملاءة × 2000)'}
            </div>
          </div>

          <Button onClick={submit} disabled={busy || !form.name} className="w-full">
            {busy ? '...' : 'إنشاء الإدراج'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
