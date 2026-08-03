import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWeb4 } from '@/components/web4/Web4Provider'
import { Mic, MapPin, Sparkles, ShieldCheck, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ServiceTip } from '@/components/ServiceTip'
import { MotivationalBadges } from '@/components/MotivationalBadges'

export const Route = createFileRoute('/_authenticated/web4')({
  head: () => ({
    meta: [
      { title: 'تفعيل Web4 — تجربة الواقع 14D | IDEA BUSINESS' },
      { name: 'description', content: 'فعّل الجيل الرابع من الويب لاستخدام الميكروفون والموقع الجغرافي مع فريق الوكلاء الستة داخل تجربة 14D.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: Web4Page,
})

function Web4Page() {
  const w4 = useWeb4()
  const [busy, setBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Auto-verify on page open when the user already went through activation.
  useEffect(() => {
    if (w4.activated && !w4.lastVerification) {
      void runVerify()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w4.activated])

  async function activate() {
    setBusy(true)
    try {
      const r = await w4.requestAll()
      if (r.outcome === 'accepted') {
        toast.success('تم تفعيل Web4 كاملاً — الوكلاء الستة يستقبلون الحالة الآن')
        await runVerify()
      } else if (r.outcome === 'partial') {
        toast.warning('تفعيل جزئي — التجربة 14D معطّلة حتى تمنح الأذونتين معاً')
      } else {
        toast.error('تم رفض الأذونات — لا يمكن تفعيل تجربة 14D')
      }
    } finally { setBusy(false) }
  }

  async function runVerify() {
    setVerifying(true)
    try {
      const v = await w4.verify()
      if (!v) return
      if (v.verified) toast.success('تحقّق ناجح: السيرفر والوكلاء الستة يستلمون حالتك')
      else toast.warning('التحقق لم يكتمل — راجع الحالة أدناه')
    } finally { setVerifying(false) }
  }

  const fullyGranted = w4.mic === 'granted' && w4.geo === 'granted'
  const anyDenied = w4.mic === 'denied' || w4.geo === 'denied'

  return (
    <div className="container mx-auto py-10 max-w-4xl space-y-6" dir="rtl">
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-8">
        <div className="absolute -top-20 -end-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <Badge className="bg-primary/20 text-primary border-primary/30 mb-3">أمر تنفيذ للفريق • الوكلاء الستة</Badge>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            فعّل <span className="text-primary">Web4</span> — تجربة الواقع الرباعي عشر 14D
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            امنح المنصة أذونات الميكروفون والموقع الجغرافي ليتفاعل معك الوكلاء الستة (القائد، المطور، المصمم، الباحث، الكاتب، المحلل) في تجربة غامرة متعددة الأبعاد.
          </p>
          {w4.activated ? (
            <Badge className="mt-4 bg-emerald-500/20 text-emerald-700 border-emerald-500/40">
              <CheckCircle2 className="w-3.5 h-3.5 me-1" /> مفعّل — البُعد 14D
            </Badge>
          ) : (
            <Badge className="mt-4 bg-amber-500/20 text-amber-700 border-amber-500/40">
              <AlertTriangle className="w-3.5 h-3.5 me-1" /> غير مفعّل بعد
            </Badge>
          )}
        </div>
      </section>

      <ServiceTip
        id="web4-explain-v1"
        icon="lightbulb"
        tone="primary"
        title="ما هو Web4 ولماذا تحتاجه؟"
        body="Web4 يمنح الوكلاء الستة سياقاً موحداً عن جلستك (الميكروفون + الموقع الجغرافي فقط عند الحاجة). النتيجة: أوامر صوتية، توصيات جغرافية، وتجربة غامرة 14D. يمكنك سحب أي إذن في أي لحظة."
      />


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PermCard icon={Mic} title="الميكروفون" desc="لأوامر صوتية مع القائد والكاتب، وتحويل النطق إلى نص فوري داخل المساعد." state={w4.mic} />
        <PermCard
          icon={MapPin} title="الموقع الجغرافي"
          desc="لعرض مشاريع ومزودي خدمات قريبين منك، وتوصيات مالية إقليمية من المحلل."
          state={w4.geo}
          extra={w4.coords ? `آخر إحداثيات: ${w4.coords.lat.toFixed(3)}, ${w4.coords.lng.toFixed(3)} (±${Math.round(w4.coords.accuracy)}م)` : undefined}
        />
      </div>

      {/* Fallback panel when any permission is denied */}
      {anyDenied && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader><CardTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="w-5 h-5" /> تجربة 14D معطّلة — خطوات الاسترجاع</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <Bullet>افتح إعدادات الأذونات في متصفحك (أيقونة القفل بجانب الرابط) وحوّل الأذونات المرفوضة إلى "السماح".</Bullet>
            <Bullet>حدّث الصفحة ثم اضغط "إعادة المحاولة" أدناه.</Bullet>
            <Bullet>إن كنت داخل نافذة تصفح خاص، انتقل لنافذة عادية — بعض المتصفحات ترفض الميكروفون افتراضياً.</Bullet>
            <Bullet>يعمل الموقع الجغرافي فقط عبر HTTPS أو localhost.</Bullet>
            <div className="pt-2">
              <Button variant="outline" onClick={activate} disabled={busy}>
                <RefreshCw className="w-4 h-4 me-2" /> إعادة محاولة الأذونات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verification report */}
      {w4.lastVerification && (
        <Card className={w4.lastVerification.verified ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}>
          <CardHeader><CardTitle className="flex items-center gap-2">
            {w4.lastVerification.verified ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            تقرير التحقق الآلي
          </CardTitle></CardHeader>
          <CardContent className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <VLine ok={w4.lastVerification.server.activated} label="السيرفر: التفعيل مسجّل" />
            <VLine ok={w4.lastVerification.server.mic} label="السيرفر: إذن الميكروفون محفوظ" />
            <VLine ok={w4.lastVerification.server.geo} label="السيرفر: إذن الموقع محفوظ" />
            <VLine ok={w4.lastVerification.client.mic === 'granted'} label="المتصفح: الميكروفون ممنوح" />
            <VLine ok={w4.lastVerification.client.geo === 'granted'} label="المتصفح: الموقع ممنوح" />
            <VLine ok={w4.lastVerification.client.broadcast} label="بثّ الحالة إلى الوكلاء الستة" />
            {w4.lastVerification.server.updated_at && (
              <div className="text-[11px] text-muted-foreground md:col-span-2 font-mono">آخر تحديث سيرفر: {new Date(w4.lastVerification.server.updated_at).toLocaleString('ar')}</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> ما الذي سيتغيّر بعد التفعيل؟</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Bullet>يمكن للمساعد الذكي الاستماع لطلباتك بدل الكتابة.</Bullet>
          <Bullet>يعرض السوق الموازي مشاريع مطروحة في محيطك الجغرافي أولاً.</Bullet>
          <Bullet>الوكلاء الستة يشاركون سياقاً موحداً (الموقع، الحالة، الجلسة) لخدمة أذكى.</Bullet>
          <Bullet>لا تُخزَّن تسجيلات صوتية — الميكروفون يُفتح فقط أثناء طلبك.</Bullet>
        </CardContent>
      </Card>

      <Card className="border-emerald-500/40 bg-emerald-500/5">
        <CardContent className="p-5 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">خصوصيتك تحت سيطرتك</div>
            <p className="text-muted-foreground mt-1">
              نستخدم الأذونات فقط عند الحاجة الفعلية. يمكنك سحبها أي وقت من إعدادات المتصفح، أو من هذه الصفحة عبر زر "إلغاء التفعيل".
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" onClick={activate} disabled={busy} className="min-w-64">
          {busy ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ طلب الأذونات...</>
                : w4.activated ? 'إعادة طلب الأذونات' : 'فعّل Web4 الآن'}
        </Button>
        <Button size="lg" variant="secondary" onClick={runVerify} disabled={verifying || !fullyGranted}>
          {verifying ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> جارٍ التحقق...</> : 'تشغيل التحقق الآن'}
        </Button>
        {w4.activated && (
          <Button size="lg" variant="outline" onClick={w4.reset}>إلغاء التفعيل محلياً</Button>
        )}
      </div>

      {w4.lastError && (
        <div className="text-xs text-muted-foreground font-mono">تفاصيل تشخيصية: {w4.lastError}</div>
      )}

      <div className="pt-4">
        <MotivationalBadges
          title="Web4 يُنشّط سماتك التحفيزية"
          subtitle="عند تفعيل تجربة 14D، تتحرّك أدوات المنصة بما يوافق نمطك السلوكي — استقلالية، كفاءة، انتماء، وحماية لرأس مالك."
        />
      </div>
    </div>
  )
}

function PermCard({ icon: Icon, title, desc, state, extra }: any) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    granted: { label: 'ممنوح', cls: 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40', Icon: CheckCircle2 },
    denied: { label: 'مرفوض', cls: 'bg-red-500/20 text-red-700 border-red-500/40', Icon: XCircle },
    prompt: { label: 'بانتظار الطلب', cls: 'bg-amber-500/20 text-amber-700 border-amber-500/40', Icon: Sparkles },
    unknown: { label: 'غير معروف', cls: 'bg-muted text-muted-foreground', Icon: Sparkles },
  }
  const s = map[state] ?? map.unknown
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 border border-primary/20"><Icon className="w-5 h-5 text-primary" /></div>
            <div>
              <div className="font-bold">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </div>
          <Badge className={s.cls}><s.Icon className="w-3.5 h-3.5 me-1" /> {s.label}</Badge>
        </div>
        {extra && <div className="text-[11px] text-muted-foreground mt-3 font-mono">{extra}</div>}
      </CardContent>
    </Card>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{children}</span></div>
}

function VLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
      <span className={ok ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}
