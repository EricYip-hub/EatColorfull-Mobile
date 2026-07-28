import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'
import { VINTAGE_1986_ADDRESS } from '@/lib/vintage-1986-invite'

interface Props {
  guestName?: string
  guestCount?: number
  notes?: string
}

const DATE_LABEL = 'Monday, June 8, 2026 · 8:00 PM'

const Email = ({ guestName, guestCount, notes }: Props) => (
  <Shell
    preview={`You're confirmed for Vintage 1986 — ${DATE_LABEL}`}
    eyebrowText="🌿 Vintage 1986 · curated by molino"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, you're on the list.` : "You're on the list."}
    </Heading>
    <Text style={text}>
      Your RSVP for <strong>Vintage 1986</strong> — a curated Italian dinner by Molino,
      celebrating 40 — is confirmed.
    </Text>

    <Hr style={hr} />

    <Text style={meta}><strong>When:</strong> {DATE_LABEL}</Text>
    <Text style={meta}>
      <strong>Where:</strong>{' '}
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(VINTAGE_1986_ADDRESS)}`}
        style={{ color: 'inherit' }}
      >
        {VINTAGE_1986_ADDRESS}
      </a>
    </Text>
    {guestCount ? (
      <Text style={meta}><strong>Party of:</strong> {guestCount}</Text>
    ) : null}
    {notes ? <Text style={meta}><strong>Notes:</strong> {notes}</Text> : null}

    <Hr style={hr} />

    <Text style={meta}><strong>Run of show</strong></Text>
    <Text style={text}>8:00 PM — drinks & d'hordeuvres</Text>
    <Text style={text}>9:00 PM — curated Italian dinner</Text>

    <Hr style={hr} />

    <Text style={text}>
      Invite only — please don't forward without asking. Can't make it? Reply
      to this email so we can offer your seat to someone else.
    </Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: "You're confirmed — Vintage 1986 (Mon, June 8)",
  displayName: 'Vintage 1986 RSVP Confirmation',
  previewData: { guestName: 'Jane', guestCount: 2 },
} satisfies TemplateEntry
