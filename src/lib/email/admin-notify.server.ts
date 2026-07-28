import * as React from 'react'
import { render } from '@react-email/components'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

// Recipients for internal admin alerts. Hardcoded per user request; change here
// to update who receives "new host application" and "new join request" alerts.
const ADMIN_RECIPIENTS = ['info@eatcolorfull.com']

const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getOrCreateUnsubscribeToken(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', email)
    .maybeSingle()
  if (existing && !existing.used_at) return existing.token
  const fresh = generateToken()
  await supabase
    .from('email_unsubscribe_tokens')
    .upsert(
      { token: fresh, email },
      { onConflict: 'email', ignoreDuplicates: true },
    )
  const { data: stored } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token')
    .eq('email', email)
    .maybeSingle()
  return stored?.token ?? fresh
}

/**
 * Enqueue a transactional email to every admin recipient.
 * Best-effort: failures are logged but do not throw, so the caller's main
 * action (insert application, create join request) is never blocked by email.
 */
export async function notifyAdmins(
  supabase: SupabaseClient,
  opts: {
    templateName: string
    templateData: Record<string, any>
    idempotencyKeyBase: string
  },
): Promise<void> {
  const template = TEMPLATES[opts.templateName]
  if (!template) {
    console.error('[admin-notify] template missing', opts.templateName)
    return
  }

  const element = React.createElement(template.component, opts.templateData)
  let html: string
  let plainText: string
  try {
    html = await render(element)
    plainText = await render(element, { plainText: true })
  } catch (e) {
    console.error('[admin-notify] render failed', e)
    return
  }

  const subject =
    typeof template.subject === 'function'
      ? template.subject(opts.templateData)
      : template.subject

  for (const raw of ADMIN_RECIPIENTS) {
    const recipient = raw.toLowerCase().trim()
    if (!recipient) continue
    try {
      const { data: suppressed } = await supabase
        .from('suppressed_emails')
        .select('id')
        .eq('email', recipient)
        .maybeSingle()
      if (suppressed) {
        console.log('[admin-notify] recipient suppressed', recipient)
        continue
      }

      const token = await getOrCreateUnsubscribeToken(supabase, recipient)
      if (!token) {
        console.error('[admin-notify] no unsubscribe token', recipient)
        continue
      }

      const messageId = crypto.randomUUID()

      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: opts.templateName,
        recipient_email: recipient,
        status: 'pending',
      })

      const { error } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: recipient,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: plainText,
          purpose: 'transactional',
          label: opts.templateName,
          idempotency_key: `${opts.idempotencyKeyBase}::${recipient}`,
          unsubscribe_token: token,
          queued_at: new Date().toISOString(),
        },
      })
      if (error) {
        console.error('[admin-notify] enqueue failed', error)
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: opts.templateName,
          recipient_email: recipient,
          status: 'failed',
          error_message: 'enqueue_email failed',
        })
      }
    } catch (e) {
      console.error('[admin-notify] recipient loop failed', recipient, e)
    }
  }
}
