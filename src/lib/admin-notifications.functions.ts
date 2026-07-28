import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { notifyAdmins } from '@/lib/email/admin-notify.server'

const schema = z.object({
  requestId: z.string().min(1).max(100),
  tableId: z.string().min(1).max(200),
  tableTitle: z.string().min(1).max(200),
  tableDate: z.string().min(1).max(200).optional(),
  neighborhood: z.string().min(1).max(200).optional(),
  message: z.string().max(4000).optional(),
  status: z.string().min(1).max(50),
})

export const notifyAdminsOfJoinRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      console.error('[notifyAdminsOfJoinRequest] missing env')
      return { success: false }
    }
    const admin = createClient(supabaseUrl, serviceKey)

    // Look up guest profile + auth email for richer alert context.
    let guestName: string | undefined
    let guestEmail: string | undefined
    try {
      const { data: profile } = await admin
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle()
      guestName = profile?.display_name ?? undefined

      const { data: userResp } = await admin.auth.admin.getUserById(userId)
      guestEmail = userResp?.user?.email ?? undefined
    } catch (e) {
      console.warn('[notifyAdminsOfJoinRequest] guest lookup failed', e)
    }

    await notifyAdmins(admin, {
      templateName: 'admin-new-join-request',
      idempotencyKeyBase: `admin-join-${data.requestId}`,
      templateData: {
        guestName,
        guestEmail,
        tableTitle: data.tableTitle,
        tableId: data.tableId,
        tableDate: data.tableDate,
        neighborhood: data.neighborhood,
        message: data.message,
        status: data.status,
        submittedAt: new Date().toISOString(),
        adminUrl: 'https://eatcolorfull.com/host/dashboard',
      },
    })

    return { success: true }
  })
