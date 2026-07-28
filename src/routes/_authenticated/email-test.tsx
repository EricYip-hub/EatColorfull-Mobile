import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { sendTransactionalEmail } from '@/lib/email/send'
import { TEMPLATES } from '@/lib/email-templates/registry'

export const Route = createFileRoute('/_authenticated/email-test')({
  component: EmailTestPage,
})

const TEMPLATE_KEYS = ['waitlisted', 'approved', 'promoted', 'paid'] as const

function EmailTestPage() {
  const { user } = useAuth()
  const [recipient, setRecipient] = useState(user?.email ?? '')
  const [sending, setSending] = useState<string | null>(null)

  const send = async (templateName: string) => {
    if (!recipient) { toast.error('Enter a recipient email'); return }
    setSending(templateName)
    try {
      const entry = TEMPLATES[templateName]
      await sendTransactionalEmail({
        templateName,
        recipientEmail: recipient,
        idempotencyKey: `test-${templateName}-${Date.now()}`,
        templateData: entry?.previewData ?? {},
      })
      toast.success(`Test "${entry?.displayName ?? templateName}" queued to ${recipient}`)
    } catch (e: any) {
      toast.error(e?.message ?? 'Send failed')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="eyebrow">Internal · QA</p>
      <h1 className="mt-3 font-serif text-4xl">Email template test send</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Send a test of each transactional template using its preview data. The email is queued
        and delivered through the production pipeline.
      </p>

      <div className="mt-8 space-y-2">
        <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recipient</label>
        <Input
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="mt-8 grid gap-3">
        {TEMPLATE_KEYS.map((key) => {
          const entry = TEMPLATES[key]
          return (
            <div key={key} className="flex items-center justify-between border border-border p-4">
              <div>
                <p className="font-medium">{entry?.displayName ?? key}</p>
                <p className="text-xs text-muted-foreground">
                  {typeof entry?.subject === 'string' ? entry.subject : key}
                </p>
              </div>
              <Button onClick={() => send(key)} disabled={sending !== null}>
                {sending === key ? 'Sending…' : 'Send test'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
