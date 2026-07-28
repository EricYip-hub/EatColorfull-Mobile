import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const schema = z.object({
  bookingId: z.string().min(1).max(200),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(255),
  guestPhone: z.string().min(1).max(50),
  guestAge: z.number().int().min(1).max(150),
  guestCount: z.number().int().min(1).max(20),
  dietaryNotes: z.string().max(2000).optional(),
  couponCode: z.string().max(50).optional(),
  amountDueCents: z.number().int().min(0),
})

const RECIPIENTS = ['Vincent@irie.kitchen', 'Info@eatcolorfull.com']
const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

export const notifyIrieRsvp = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const React = await import('react')
    const { render } = await import('@react-email/components')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const template = TEMPLATES['irie-rsvp-notification']
    if (!template) {
      console.error('[notifyIrieRsvp] template missing')
      return { success: false }
    }

    const templateData = {
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guestAge: data.guestAge,
      guestCount: data.guestCount,
      dietaryNotes: data.dietaryNotes,
      couponCode: data.couponCode,
      amountDue: `$${(data.amountDueCents / 100).toFixed(2)}`,
      submittedAt: new Date().toISOString(),
    }

    let html: string
    let plainText: string
    try {
      const element = React.createElement(template.component, templateData)
      html = await render(element)
      plainText = await render(element, { plainText: true })
    } catch (e) {
      console.error('[notifyIrieRsvp] render failed', e)
      return { success: false }
    }

    const subject =
      typeof template.subject === 'function'
        ? template.subject(templateData)
        : template.subject

    const messageId = crypto.randomUUID()

    let overallSuccess = true

    for (const rawRecipient of RECIPIENTS) {
      const recipient = rawRecipient.toLowerCase().trim()
      const perRecipientMessageId = crypto.randomUUID()

      // Ensure an unsubscribe token exists for the recipient.
      let token: string | null = null
      try {
        const { data: existing } = await supabaseAdmin
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', recipient)
          .maybeSingle()
        if (existing && !existing.used_at) {
          token = existing.token
        } else {
          const bytes = new Uint8Array(32)
          crypto.getRandomValues(bytes)
          const fresh = Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
          await supabaseAdmin
            .from('email_unsubscribe_tokens')
            .upsert(
              { token: fresh, email: recipient },
              { onConflict: 'email', ignoreDuplicates: true },
            )
          const { data: stored } = await supabaseAdmin
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', recipient)
            .maybeSingle()
          token = stored?.token ?? fresh
        }
      } catch (e) {
        console.error('[notifyIrieRsvp] token lookup failed', e)
      }
      if (!token) {
        overallSuccess = false
        continue
      }

      try {
        await supabaseAdmin.from('email_send_log').insert({
          message_id: perRecipientMessageId,
          template_name: 'irie-rsvp-notification',
          recipient_email: recipient,
          status: 'pending',
        })

        const { error } = await supabaseAdmin.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: perRecipientMessageId,
            to: recipient,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: 'irie-rsvp-notification',
            idempotency_key: `irie-rsvp-${data.bookingId}::${recipient}`,
            unsubscribe_token: token,
            queued_at: new Date().toISOString(),
          },
        })
        if (error) {
          console.error('[notifyIrieRsvp] enqueue failed', error)
          overallSuccess = false
        }
      } catch (e) {
        console.error('[notifyIrieRsvp] send failed', e)
        overallSuccess = false
      }
    }

    return { success: overallSuccess, messageId }
  })
