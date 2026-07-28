import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const RSVP_CODE = 'shai2026'
const EVENT_SLUG = 'vintage-1986'
const HOST_RECIPIENTS = ['Mosheifhima@gmail.com', 'Info@eatcolorfull.com']
const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  guestCount: z.number().int().min(1).max(8),
  code: z.string().trim().min(1).max(50),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export const submitVintageRsvp = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    if (data.code.trim().toLowerCase() !== RSVP_CODE) {
      throw new Error('Invalid invite code')
    }

    const React = await import('react')
    const { render } = await import('@react-email/components')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: booking, error: insertErr } = await supabaseAdmin
      .from('event_bookings')
      .insert({
        event_slug: EVENT_SLUG,
        full_name: data.fullName,
        email: data.email.toLowerCase().trim(),
        phone: data.phone,
        guest_count: data.guestCount,
        coupon_code: data.code,
        notes: data.notes || null,
        payment_status: 'confirmed',
      })
      .select('id')
      .single()
    if (insertErr) {
      console.error('[vintageRsvp] insert failed', insertErr)
      throw new Error('Could not save your RSVP. Please try again.')
    }

    const bookingId = booking?.id ?? crypto.randomUUID()

    async function getOrCreateToken(recipient: string): Promise<string | null> {
      try {
        const { data: existing } = await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', recipient)
          .maybeSingle()
        if (existing && !existing.used_at) return existing.token
        const bytes = new Uint8Array(32)
        crypto.getRandomValues(bytes)
        const fresh = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
        await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .upsert({ token: fresh, email: recipient }, { onConflict: 'email', ignoreDuplicates: true })
        const { data: stored } = await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .select('token')
          .eq('email', recipient)
          .maybeSingle()
        return stored?.token ?? fresh
      } catch (e) {
        console.error('[vintageRsvp] token failed', e)
        return null
      }
    }

    async function sendTo(recipient: string, label: string) {
      const tpl = TEMPLATES['vintage-1986-rsvp']
      if (!tpl) return false
      const templateData = {
        guestName: data.fullName,
        guestCount: data.guestCount,
        notes: data.notes || undefined,
      }
      const element = React.createElement(tpl.component, templateData)
      const html = await render(element)
      const plainText = await render(element, { plainText: true })
      const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject
      const r = recipient.toLowerCase().trim()
      const token = await getOrCreateToken(r)
      if (!token) return false
      const perRecipientMessageId = crypto.randomUUID()
      await supabaseAdmin.from('email_send_log').insert({
        message_id: perRecipientMessageId,
        template_name: 'vintage-1986-rsvp',
        recipient_email: r,
        status: 'pending',
      })
      const { error } = await supabaseAdmin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: perRecipientMessageId,
          to: r,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          sender_domain: SENDER_DOMAIN,
          subject: label === 'host' ? `New RSVP · Vintage 1986 — ${data.fullName} (party of ${data.guestCount})` : subject,
          html,
          text: plainText,
          purpose: 'transactional',
          label: `vintage-1986-${label}`,
          idempotency_key: `vintage-1986-${label}-${bookingId}::${r}`,
          unsubscribe_token: token,
          queued_at: new Date().toISOString(),
        },
      })
      if (error) {
        console.error('[vintageRsvp] enqueue failed', error)
        return false
      }
      return true
    }

    // Guest confirmation
    await sendTo(data.email, 'guest')
    // Host notifications
    for (const host of HOST_RECIPIENTS) {
      await sendTo(host, 'host')
    }

    return { success: true, bookingId }
  })
