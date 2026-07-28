import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

const schema = z.object({
  email: z.string().trim().email().max(255),
})

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/host-application/resend')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let payload: z.infer<typeof schema>
        try {
          payload = schema.parse(await request.json())
        } catch (e: any) {
          return Response.json({ error: 'Invalid email' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey)
        const recipient = payload.email.toLowerCase()

        // Look up most recent application for this email
        const { data: app } = await supabase
          .from('host_applications')
          .select('id, name, email')
          .ilike('email', recipient)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!app) {
          // Don't reveal whether email exists
          return Response.json({ success: true })
        }

        // Suppression check
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', recipient)
          .maybeSingle()
        if (suppressed) {
          return Response.json({ success: true })
        }

        // Rate limit: count host-application-received sends to this email in the last 24h.
        // Cooldown 60s between sends; max 5 per 24h.
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: recentSends } = await supabase
          .from('email_send_log')
          .select('created_at')
          .eq('recipient_email', recipient)
          .eq('template_name', 'host-application-received')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10)

        const sends = recentSends ?? []
        if (sends.length > 0) {
          const lastSent = new Date(sends[0].created_at as string).getTime()
          const secondsSince = (Date.now() - lastSent) / 1000
          if (secondsSince < 60) {
            const retryAfter = Math.ceil(60 - secondsSince)
            return Response.json(
              { error: 'Please wait a moment before resending.', retry_after: retryAfter },
              { status: 429, headers: { 'Retry-After': String(retryAfter) } },
            )
          }
        }
        if (sends.length >= 5) {
          return Response.json(
            { error: 'Daily resend limit reached. Please contact us if you still need help.' },
            { status: 429, headers: { 'Retry-After': '3600' } },
          )
        }

        try {
          const template = TEMPLATES['host-application-received']
          if (!template) throw new Error('Template missing')

          const messageId = crypto.randomUUID()

          let unsubscribeToken: string
          const { data: existing } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token, used_at')
            .eq('email', recipient)
            .maybeSingle()
          if (existing && !existing.used_at) {
            unsubscribeToken = existing.token
          } else {
            unsubscribeToken = generateToken()
            await supabase
              .from('email_unsubscribe_tokens')
              .upsert({ token: unsubscribeToken, email: recipient }, { onConflict: 'email', ignoreDuplicates: true })
            const { data: stored } = await supabase
              .from('email_unsubscribe_tokens')
              .select('token')
              .eq('email', recipient)
              .maybeSingle()
            if (stored) unsubscribeToken = stored.token
          }

          const element = React.createElement(template.component, { name: app.name })
          const html = await render(element)
          const plainText = await render(element, { plainText: true })
          const subject = typeof template.subject === 'function' ? template.subject({ name: app.name }) : template.subject

          await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: 'host-application-received',
            recipient_email: recipient,
            status: 'pending',
          })

          await supabase.rpc('enqueue_email', {
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
              label: 'host-application-received',
              idempotency_key: `host-app-resend-${app.id}-${Date.now()}`,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })
        } catch (e) {
          console.error('host application resend failed', e)
          return Response.json({ error: 'Failed to resend' }, { status: 500 })
        }

        return Response.json({ success: true })
      },
    },
  },
})
