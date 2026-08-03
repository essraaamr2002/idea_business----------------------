import { useEffect, useState } from 'react'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { MailX, CheckCircle2, AlertCircle } from 'lucide-react'

type Status = 'loading' | 'valid' | 'invalid' | 'already' | 'success' | 'error' | 'submitting'

export const Route = createFileRoute('/unsubscribe')({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === 'string' ? s.token : '' }),
  head: () => ({
    meta: [
      { title: 'إلغاء الاشتراك | IDEA BUSINESS' },
      { name: 'description', content: 'إلغاء الاشتراك من رسائل IDEA BUSINESS.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: UnsubPage,
})

function UnsubPage() {
  const { token } = useSearch({ from: '/unsubscribe' })
  const [status, setStatus] = useState<Status>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); setMsg('الرابط غير صالح.'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) setStatus('valid')
        else if (d.reason === 'already_unsubscribed') setStatus('already')
        else { setStatus('invalid'); setMsg(d.error || 'الرابط غير صالح أو منتهي.') }
      })
      .catch(() => { setStatus('error'); setMsg('تعذّر التحقق من الرابط.') })
  }, [token])

  const confirm = async () => {
    setStatus('submitting')
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (d.success) setStatus('success')
      else if (d.reason === 'already_unsubscribed') setStatus('already')
      else { setStatus('error'); setMsg(d.error || 'حدث خطأ.') }
    } catch {
      setStatus('error'); setMsg('تعذّر إكمال الطلب.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-border bg-card/60 p-8">
          {status === 'loading' && <p className="text-sm text-muted-foreground">جارٍ التحقق…</p>}

          {status === 'valid' && (
            <>
              <MailX className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-3 text-2xl font-bold">تأكيد إلغاء الاشتراك</h1>
              <p className="mt-2 text-sm text-muted-foreground">لن تتلقى رسائل تسويقية أو إشعارات بريدية بعد التأكيد.</p>
              <button onClick={confirm} className="mt-6 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground hover:opacity-90">
                تأكيد إلغاء الاشتراك
              </button>
            </>
          )}

          {status === 'submitting' && <p className="text-sm text-muted-foreground">جارٍ المعالجة…</p>}

          {status === 'success' && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h1 className="mt-3 text-2xl font-bold">تم إلغاء الاشتراك</h1>
              <p className="mt-2 text-sm text-muted-foreground">يمكنك إعادة الاشتراك في أي وقت من إعدادات حسابك.</p>
            </>
          )}

          {status === 'already' && (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
              <h1 className="mt-3 text-2xl font-bold">أنت غير مشترك أصلًا</h1>
              <p className="mt-2 text-sm text-muted-foreground">لن تتلقى رسائل تسويقية منا.</p>
            </>
          )}

          {(status === 'invalid' || status === 'error') && (
            <>
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h1 className="mt-3 text-2xl font-bold">خطأ</h1>
              <p className="mt-2 text-sm text-muted-foreground">{msg}</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
