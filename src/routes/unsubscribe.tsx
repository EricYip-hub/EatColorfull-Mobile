import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/unsubscribe')({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({ token: (s.token as string) || '' }),
})

function UnsubscribePage() {
  const { token } = Route.useSearch()
  const [state, setState] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setState('valid')
        else if (d.reason === 'already_unsubscribed') setState('already')
        else setState('invalid')
      })
      .catch(() => setState('error'))
  }, [token])

  const confirm = async () => {
    try {
      const res = await fetch('/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (d.success) setState('done')
      else if (d.reason === 'already_unsubscribed') setState('already')
      else setState('error')
    } catch { setState('error') }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-32 text-center">
      <p className="eyebrow">Email preferences</p>
      <h1 className="mt-4 font-serif text-4xl">Unsubscribe</h1>
      <div className="mt-8 text-sm text-muted-foreground">
        {state === 'loading' && 'Verifying…'}
        {state === 'invalid' && 'This unsubscribe link is invalid or expired.'}
        {state === 'already' && "You're already unsubscribed."}
        {state === 'error' && 'Something went wrong. Please try again.'}
        {state === 'done' && "You've been unsubscribed. We're sorry to see you go."}
        {state === 'valid' && (
          <>
            <p>Confirm you'd like to stop receiving emails from Colorfull Tables.</p>
            <Button className="mt-6" onClick={confirm}>Confirm unsubscribe</Button>
          </>
        )}
      </div>
    </div>
  )
}
