import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/PageHeader'
import { Mail, Send, ShieldAlert } from 'lucide-react'
import { sendTransactionalEmail } from '@/lib/email/send'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const Route = createFileRoute('/email-test')({
  head: () => ({
    meta: [
      { title: 'اختبار الإيميل | IDEA BUSINESS' },
      { name: 'description', content: 'أرسل رسالة ترحيب اختبارية من دومينك.' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: EmailTestPage,
})

function EmailTestPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sending, setSending] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [ownEmail, setOwnEmail] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      setOwnEmail(user?.email ?? null)
      if (!user) { setAuthChecked(true); return }
      const { data: ok } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any })
      setIsAdmin(Boolean(ok))
      setAuthChecked(true)
    })()
  }, [])

  const send = async () => {
    if (!isAdmin) { toast.error('هذه الصفحة للمسؤولين فقط'); return }
    // Defence in depth: only allow sending to the signed-in admin's own email.
    const target = (ownEmail || '').toLowerCase()
    if (!target) { toast.error('لا يوجد بريد مرتبط بحسابك'); return }
    if (email && email.trim().toLowerCase() !== target) {
      toast.error('يمكنك الإرسال إلى بريدك الخاص فقط لأغراض الاختبار')
      return
    }
    setSending(true)
    try {
      await sendTransactionalEmail({
        templateName: 'welcome',
        recipientEmail: target,
        idempotencyKey: `test-${Date.now()}`,
        templateData: { name: name || undefined },
      })
      toast.success('تم إرسال الرسالة! تحقق من بريدك خلال دقائق.')
    } catch (e: any) {
      toast.error(e.message || 'فشل الإرسال')
    } finally { setSending(false) }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background"><main className="mx-auto max-w-md px-4 py-10 text-sm text-muted-foreground">جارٍ التحقق…</main></div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-md px-4 py-10">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-2 text-lg font-extrabold">غير مصرح</h2>
            <p className="mt-1 text-sm text-muted-foreground">أداة اختبار الإرسال متاحة للمسؤولين فقط.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-4 py-10">
        <PageHeader icon={<Mail className="h-6 w-6" />} title="اختبار الإيميل" subtitle="أرسل رسالة ترحيب اختبارية إلى بريدك" />
        <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-muted-foreground">البريد المستلم (يجب أن يكون بريدك)</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={ownEmail ?? ''} dir="ltr" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-muted-foreground">الاسم (اختياري)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="سارة" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
          <button onClick={send} disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Send className="h-4 w-4" /> {sending ? 'جارٍ الإرسال…' : 'إرسال الرسالة'}
          </button>
          <p className="text-xs text-muted-foreground">قيد على الإرسال: المسؤولون فقط، وإلى بريدهم الخاص فقط.</p>
        </div>
      </main>
    </div>
  )
}
