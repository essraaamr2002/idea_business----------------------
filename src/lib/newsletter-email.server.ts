// Server-only helper to enqueue a rendered React Email into the
// transactional_emails pgmq queue, bypassing the auth-gated /lovable/email/transactional/send
// route. Use only from trusted server contexts (server functions / server routes)
// after validating the recipient and event.
import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

const SITE_NAME = 'IDEA BUSINESS'
const SENDER_DOMAIN = 'notify.busniss.org'
const FROM_DOMAIN = 'busniss.org'

function genToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function enqueueTemplateEmail(opts: {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}): Promise<{ ok: boolean; reason?: string }> {
  const template = TEMPLATES[opts.templateName]
  if (!template) return { ok: false, reason: 'template_not_found' }
  const email = opts.recipientEmail.trim().toLowerCase()
  if (!email) return { ok: false, reason: 'invalid_email' }

  const { data: sup } = await supabaseAdmin
    .from('suppressed_emails').select('id').eq('email', email).maybeSingle()
  if (sup) return { ok: false, reason: 'suppressed' }

  // Ensure an unsubscribe token exists (footer link)
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', email).maybeSingle()
  let unsubToken = existing?.token
  if (!existing) {
    unsubToken = genToken()
    await supabaseAdmin.from('email_unsubscribe_tokens')
      .upsert({ email, token: unsubToken } as any, { onConflict: 'email', ignoreDuplicates: true })
    const { data: re } = await supabaseAdmin
      .from('email_unsubscribe_tokens').select('token').eq('email', email).maybeSingle()
    unsubToken = re?.token || unsubToken
  }

  const element = React.createElement(template.component as any, opts.templateData || {})
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function'
    ? template.subject(opts.templateData || {})
    : template.subject

  const messageId = crypto.randomUUID()
  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: opts.templateName,
    recipient_email: email,
    status: 'pending',
  } as any)

  const { error } = await supabaseAdmin.rpc('enqueue_email' as any, {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: opts.templateName,
      idempotency_key: opts.idempotencyKey || messageId,
      unsubscribe_token: unsubToken,
      queued_at: new Date().toISOString(),
    },
  } as any)

  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: email,
      status: 'failed',
      error_message: error.message,
    } as any)
    return { ok: false, reason: 'enqueue_failed' }
  }
  return { ok: true }
}
