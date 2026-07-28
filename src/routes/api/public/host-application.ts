import * as React from 'react'
import { render } from '@react-email/components'
import { createClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { notifyAdmins } from '@/lib/email/admin-notify.server'

const SITE_NAME = 'Colorfull Tables'
const SENDER_DOMAIN = 'notify.eatcolorfull.com'
const FROM_DOMAIN = 'eatcolorfull.com'

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(50).optional().default(''),
  location: z.string().trim().min(1).max(200),
  instagram: z.string().trim().max(200).optional().or(z.literal('')),
  experience_type: z.string().trim().max(500).optional().default(''),
  background: z.string().trim().min(1).max(4000),
  sample_menu: z.string().trim().max(4000).optional().default(''),
  guest_count: z.coerce.number().int().min(0).max(100).optional().default(0),
  location_status: z.string().trim().max(200).optional().default(''),
  motivation: z.string().trim().min(1).max(4000),
  food_prep_location: z.string().trim().max(200).optional().default(''),
  county_city: z.string().trim().max(200).optional().default(''),
  permit_number: z.string().trim().max(200).optional().default(''),
  permit_agency: z.string().trim().max(200).optional().default(''),
  permit_expiration: z.string().trim().max(40).optional().default(''),
  emergency_contact: z.string().trim().max(300).optional().default(''),
})

const DOC_FIELDS = [
  ['doc_food_handler', 'Food handler card'],
  ['doc_cfpm', 'CFPM certificate'],
  ['doc_mehko', 'MEHKO permit'],
  ['doc_catering', 'Catering permit'],
  ['doc_business_license', 'Business license'],
  ['doc_gl_insurance', 'General liability insurance'],
  ['doc_liquor', 'Liquor liability insurance'],
  ['doc_venue_approval', 'Venue / lease / HOA approval'],
] as const

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB per file
const MAX_TOTAL_BYTES = 25 * 1024 * 1024 // 25MB total
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png'])

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const Route = createFileRoute('/api/public/host-application')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        let payload: z.infer<typeof schema>
        let uploadedDocs: Array<{
          key: string
          label: string
          path: string
          filename: string
          size: number
          mime: string
        }> = []
        const filesToUpload: Array<{ key: string; label: string; file: File }> = []

        const contentType = request.headers.get('content-type') || ''
        try {
          if (contentType.includes('multipart/form-data')) {
            const form = await request.formData()
            const raw: Record<string, unknown> = {}
            for (const [k, v] of form.entries()) {
              if (typeof v === 'string') raw[k] = v
            }
            payload = schema.parse(raw)

            let total = 0
            for (const [key, label] of DOC_FIELDS) {
              const entry = form.get(key)
              if (entry && entry instanceof File && entry.size > 0) {
                if (!ALLOWED_MIME.has(entry.type)) {
                  return Response.json(
                    { error: `Unsupported file type for ${label}. Use PDF, JPG, or PNG.` },
                    { status: 400 },
                  )
                }
                if (entry.size > MAX_FILE_BYTES) {
                  return Response.json(
                    { error: `${label} exceeds 10MB limit.` },
                    { status: 400 },
                  )
                }
                total += entry.size
                if (total > MAX_TOTAL_BYTES) {
                  return Response.json(
                    { error: 'Uploaded files exceed 25MB total.' },
                    { status: 400 },
                  )
                }
                filesToUpload.push({ key, label, file: entry })
              }
            }
          } else {
            const body = await request.json()
            payload = schema.parse(body)
          }
        } catch (e: any) {
          return Response.json({ error: 'Invalid input', details: e?.message }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, serviceKey)

        // 1. Insert application
        const { data: inserted, error: insertError } = await supabase
          .from('host_applications')
          .insert({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            location: payload.location,
            instagram: payload.instagram || null,
            experience_type: payload.experience_type,
            background: payload.background,
            sample_menu: payload.sample_menu,
            guest_count: payload.guest_count,
            location_status: payload.location_status,
            motivation: payload.motivation,
            food_prep_location: payload.food_prep_location || null,
            county_city: payload.county_city || null,
            permit_number: payload.permit_number || null,
            permit_agency: payload.permit_agency || null,
            permit_expiration: payload.permit_expiration || null,
            emergency_contact: payload.emergency_contact || null,
            max_capacity: payload.guest_count || null,
          })
          .select('id')
          .single()

        if (insertError || !inserted) {
          console.error('host_applications insert failed', insertError)
          return Response.json({ error: 'Failed to save application' }, { status: 500 })
        }

        // 1a. Upload compliance documents (best-effort; do not fail submission)
        if (filesToUpload.length > 0) {
          for (const { key, label, file } of filesToUpload) {
            try {
              const safeName = sanitizeFilename(file.name || `${key}.bin`)
              const path = `applications/${inserted.id}/${key}-${Date.now()}-${safeName}`
              const buf = new Uint8Array(await file.arrayBuffer())
              const { error: upErr } = await supabase.storage
                .from('host-compliance-docs')
                .upload(path, buf, {
                  contentType: file.type,
                  upsert: false,
                })
              if (upErr) {
                console.error('compliance doc upload failed', key, upErr)
                continue
              }
              uploadedDocs.push({
                key,
                label,
                path,
                filename: safeName,
                size: file.size,
                mime: file.type,
              })
            } catch (e) {
              console.error('compliance doc upload error', key, e)
            }
          }
          if (uploadedDocs.length > 0) {
            await supabase
              .from('host_applications')
              .update({ compliance_docs: uploadedDocs })
              .eq('id', inserted.id)
          }
        }

        // 1b. Audit log for /admin/contacts
        try {
          await supabase.from('form_submissions').insert({
            source: 'host_application',
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            location: payload.location,
            notes: payload.motivation,
            payload: {
              instagram: payload.instagram || null,
              experience_type: payload.experience_type,
              guest_count: payload.guest_count,
              location_status: payload.location_status,
              host_application_id: inserted.id,
              compliance_docs_count: uploadedDocs.length,
            },
          })
        } catch (e) {
          console.error('form_submissions log failed', e)
        }

        // 2. Send confirmation email (best-effort; do not fail submission if email fails)
        try {
          const template = TEMPLATES['host-application-received']
          if (!template) throw new Error('Template missing')

          const recipient = payload.email.toLowerCase()
          const messageId = crypto.randomUUID()

          // Suppression check
          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', recipient)
            .maybeSingle()

          if (suppressed) {
            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'host-application-received',
              recipient_email: recipient,
              status: 'suppressed',
            })
            return Response.json({ success: true, id: inserted.id })
          }

          // Unsubscribe token
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

          const element = React.createElement(template.component, { name: payload.name })
          const html = await render(element)
          const plainText = await render(element, { plainText: true })
          const subject = typeof template.subject === 'function' ? template.subject({ name: payload.name }) : template.subject

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
              idempotency_key: `host-app-${inserted.id}`,
              unsubscribe_token: unsubscribeToken,
              queued_at: new Date().toISOString(),
            },
          })
        } catch (e) {
          console.error('host application email enqueue failed', e)
        }

        // 2b. Send immediate approval/welcome email to every new host (best-effort)
        try {
          const template = TEMPLATES['host-approved']
          if (!template) throw new Error('host-approved template missing')

          const recipient = payload.email.toLowerCase()
          const messageId = crypto.randomUUID()

          const { data: suppressed } = await supabase
            .from('suppressed_emails')
            .select('id')
            .eq('email', recipient)
            .maybeSingle()

          if (!suppressed) {
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

            const templateData = {
              name: payload.name,
              dashboardUrl: 'https://eatcolorfull.com/host/dashboard',
            }
            const element = React.createElement(template.component, templateData)
            const html = await render(element)
            const plainText = await render(element, { plainText: true })
            const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

            await supabase.from('email_send_log').insert({
              message_id: messageId,
              template_name: 'host-approved',
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
                label: 'host-approved',
                idempotency_key: `host-approved-${inserted.id}`,
                unsubscribe_token: unsubscribeToken,
                queued_at: new Date().toISOString(),
              },
            })
          }
        } catch (e) {
          console.error('host approval email enqueue failed', e)
        }

        // 3. Notify admins (best-effort)
        try {
          await notifyAdmins(supabase, {
            templateName: 'admin-new-host-application',
            idempotencyKeyBase: `admin-host-app-${inserted.id}`,
            templateData: {
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              location: payload.location,
              instagram: payload.instagram || undefined,
              experienceType: payload.experience_type,
              guestCount: payload.guest_count,
              locationStatus: payload.location_status,
              motivation: payload.motivation,
              background: payload.background,
              sampleMenu: payload.sample_menu,
              submittedAt: new Date().toISOString(),
              adminUrl: 'https://eatcolorfull.com/admin/reviews',
            },
          })
        } catch (e) {
          console.error('admin host-application notify failed', e)
        }

        return Response.json({ success: true, id: inserted.id })
      },
    },
  },
})
