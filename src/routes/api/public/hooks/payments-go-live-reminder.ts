import * as React from 'react'
import { render } from '@react-email/components'
import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const ADMIN_RECIPIENTS = ['info@eatcolorfull.com']
const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'
const CHECKLIST_URL = 'https://eatcolorfull.com/admin/payments-go-live'

// Pending steps mirror the static checklist in admin.payments-go-live.tsx.
// Update both if the checklist changes.
const PENDING_STEPS = [
  'Step 2: Complete the go-live form on Stripe',
  'Step 3: Install the Lovable app on your LIVE Stripe account',
  'Step 4: Provision live API keys',
  'Step 5: Readiness check',
]

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/hooks/payments-go-live-reminder')({
  server: {
    handlers: {
      POST: async () => {
        // Skip if checklist marked complete
        const { data: state } = await supabaseAdmin
          .from('payments_go_live_state')
          .select('completed')
          .eq('id', true)
          .maybeSingle()
        if (state?.completed) {
          return Response.json({ skipped: 'completed' })
        }

        const template = TEMPLATES['payments-go-live-reminder']
        if (!template) {
          return Response.json({ error: 'template_missing' }, { status: 500 })
        }

        const element = React.createElement(template.component, {
          pendingSteps: PENDING_STEPS,
          checklistUrl: CHECKLIST_URL,
        })
        const html = await render(element)
        const plainText = await render(element, { plainText: true })
        const subject =
          typeof template.subject === 'function'
            ? template.subject({})
            : template.subject

        const today = new Date().toISOString().slice(0, 10)
        const results: any[] = []

        for (const raw of ADMIN_RECIPIENTS) {
          const recipient = raw.toLowerCase().trim()
          try {
            const { data: suppressed } = await supabaseAdmin
              .from('suppressed_emails')
              .select('id')
              .eq('email', recipient)
              .maybeSingle()
            if (suppressed) {
              results.push({ recipient, skipped: 'suppressed' })
              continue
            }

            // unsubscribe token
            const { data: existing } = await supabaseAdmin
              .from('email_unsubscribe_tokens')
              .select('token, used_at')
              .eq('email', recipient)
              .maybeSingle()
            let token = existing && !existing.used_at ? existing.token : generateToken()
            if (!existing || existing.used_at) {
              await supabaseAdmin
                .from('email_unsubscribe_tokens')
                .upsert({ token, email: recipient }, { onConflict: 'email', ignoreDuplicates: true })
              const { data: stored } = await supabaseAdmin
                .from('email_unsubscribe_tokens')
                .select('token')
                .eq('email', recipient)
                .maybeSingle()
              if (stored?.token) token = stored.token
            }

            const messageId = crypto.randomUUID()
            await supabaseAdmin.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'payments-go-live-reminder',
              recipient_email: recipient,
              status: 'pending',
            })

            const { error } = await supabaseAdmin.rpc('enqueue_email', {
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
                label: 'payments-go-live-reminder',
                // daily-unique idempotency: one reminder per recipient per day
                idempotency_key: `payments-go-live-reminder-${today}::${recipient}`,
                unsubscribe_token: token,
                queued_at: new Date().toISOString(),
              },
            })
            if (error) {
              console.error('[go-live-reminder] enqueue failed', error)
              results.push({ recipient, error: 'enqueue_failed' })
            } else {
              results.push({ recipient, queued: true })
            }
          } catch (e) {
            console.error('[go-live-reminder] failed', recipient, e)
            results.push({ recipient, error: String(e) })
          }
        }

        return Response.json({ ok: true, results })
      },
    },
  },
})
