import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const schema = z.object({
  bookingId: z.string().min(1).max(200),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(255),
  guestPhone: z.string().min(1).max(50),
  pickupTime: z.string().min(1).max(50),
  margheritaQty: z.number().int().min(0).max(20),
  margheritaAddons: z.string().max(500).optional(),
  biancaQty: z.number().int().min(0).max(20),
  biancaAddons: z.string().max(500).optional(),
  pastaQty: z.number().int().min(0).max(20).optional(),
  pastaAddons: z.string().max(500).optional(),
  calzoneQty: z.number().int().min(0).max(20).optional(),
  eventLabel: z.string().min(1).max(200).optional(),
  pickupDateLabel: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  amountDueCents: z.number().int().min(0),
})

const RECIPIENTS = ['Mosheifhima@gmail.com', 'Info@eatcolorfull.com']
const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

export const notifyMolinoOrder = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const React = await import('react')
    const { render } = await import('@react-email/components')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const templateData = {
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      pickupTime: data.pickupTime,
      pickupDateLabel: data.pickupDateLabel,
      eventLabel: data.eventLabel,
      margheritaQty: data.margheritaQty,
      margheritaAddons: data.margheritaAddons,
      biancaQty: data.biancaQty,
      biancaAddons: data.biancaAddons,
      pastaQty: data.pastaQty,
      pastaAddons: data.pastaAddons,
      calzoneQty: data.calzoneQty,
      notes: data.notes,
      amountDue: `$${(data.amountDueCents / 100).toFixed(2)}`,
      submittedAt: new Date().toISOString(),
    }

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
        return stored?.token ?? fresh
      } catch (e) {
        console.error('[notifyMolinoOrder] token lookup failed', e)
        return null
      }
    }

    async function sendOne(opts: {
      templateName: 'molino-order-notification' | 'molino-order-confirmation'
      recipient: string
    }): Promise<boolean> {
      const tpl = TEMPLATES[opts.templateName]
      if (!tpl) {
        console.error('[notifyMolinoOrder] template missing', opts.templateName)
        return false
      }

      let html: string
      let plainText: string
      try {
        const element = React.createElement(tpl.component, templateData)
        html = await render(element)
        plainText = await render(element, { plainText: true })
      } catch (e) {
        console.error('[notifyMolinoOrder] render failed', opts.templateName, e)
        return false
      }

      const subject =
        typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

      const recipient = opts.recipient.toLowerCase().trim()
      const token = await getOrCreateToken(recipient)
      if (!token) return false

      const perRecipientMessageId = crypto.randomUUID()
      try {
        await supabaseAdmin.from('email_send_log').insert({
          message_id: perRecipientMessageId,
          template_name: opts.templateName,
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
            label: opts.templateName,
            idempotency_key: `${opts.templateName}-${data.bookingId}::${recipient}`,
            unsubscribe_token: token,
            queued_at: new Date().toISOString(),
          },
        })
        if (error) {
          console.error('[notifyMolinoOrder] enqueue failed', error)
          return false
        }
        return true
      } catch (e) {
        console.error('[notifyMolinoOrder] send failed', e)
        return false
      }
    }

    const messageId = crypto.randomUUID()
    let overallSuccess = true

    // Notify hosts
    for (const rawRecipient of RECIPIENTS) {
      const ok = await sendOne({
        templateName: 'molino-order-notification',
        recipient: rawRecipient,
      })
      if (!ok) overallSuccess = false
    }

    // Confirm to the guest
    if (data.guestEmail) {
      const guest = data.guestEmail.toLowerCase().trim()
      const alreadyNotified = RECIPIENTS.some(
        (r) => r.toLowerCase().trim() === guest,
      )
      if (!alreadyNotified) {
        const ok = await sendOne({
          templateName: 'molino-order-confirmation',
          recipient: guest,
        })
        if (!ok) overallSuccess = false
      }
    }

    return { success: overallSuccess, messageId }
  })

