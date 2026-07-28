import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'
import { VINTAGE_1986_ADDRESS } from '@/lib/vintage-1986-invite'

interface Props {
  guestName?: string
}

const DATE_LABEL = 'Monday, June 8, 2026 · 8:00 PM'

const Email = ({ guestName }: Props) => (
  <Shell
    preview={`Address update — Vintage 1986 tonight at ${VINTAGE_1986_ADDRESS}`}
    eyebrowText="🌿 Vintage 1986 · curated by molino"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `Hi ${guestName}, quick update.` : "Hi, quick update."}
    </Heading>

    <Text style={text}>
      The correct address for tonight&apos;s Vintage 1986 dinner is:
    </Text>

    <Text style={{ ...text, fontWeight: 600, fontSize: '16px', color: '#1a1a1a' }}>
      {VINTAGE_1986_ADDRESS}
    </Text>

    <Text style={text}>
      <a
        href={`https://maps.google.com/?q=${encodeURIComponent(VINTAGE_1986_ADDRESS)}`}
        style={{ color: '#7a6f63', textDecoration: 'underline' }}
      >
        Open in Google Maps
      </a>
    </Text>

    <Hr style={hr} />

    <Text style={meta}><strong>When:</strong> {DATE_LABEL}</Text>
    <Text style={meta}><strong>What:</strong> Curated Italian dinner by Molino</Text>

    <Hr style={hr} />

    <Text style={text}>
      Apologies for any earlier confusion. Can&apos;t wait to see you tonight.
    </Text>
    <Text style={{ ...text, margin: '0' }}>— Shai</Text>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Address update — Vintage 1986 tonight',
  displayName: 'Vintage 1986 Address Update',
  previewData: { guestName: 'Jane' },
} satisfies TemplateEntry