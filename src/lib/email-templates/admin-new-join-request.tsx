import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface Props {
  guestName?: string
  guestEmail?: string
  tableTitle?: string
  tableId?: string
  tableDate?: string
  neighborhood?: string
  message?: string
  status?: string
  submittedAt?: string
  adminUrl?: string
}

const truncate = (s: string | undefined, n = 800) =>
  !s ? '' : s.length > n ? `${s.slice(0, n)}…` : s

const AdminNewJoinRequestEmail = ({
  guestName,
  guestEmail,
  tableTitle,
  tableId,
  tableDate,
  neighborhood,
  message,
  status,
  submittedAt,
  adminUrl,
}: Props) => (
  <Shell
    preview={`New seat request${tableTitle ? ` for ${tableTitle}` : ''}`}
    eyebrowText={status === 'waitlisted' ? 'New waitlist request' : 'New seat request'}
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName} requested a seat.` : 'A new guest requested a seat.'}
    </Heading>
    <Text style={text}>
      {status === 'waitlisted'
        ? 'The table is full, so they were added to the waitlist. Review their note when you have a moment.'
        : 'A new request is waiting for host review.'}
    </Text>

    <Hr style={hr} />

    {tableTitle && <Text style={meta}><strong>Table:</strong> {tableTitle}</Text>}
    {tableDate && <Text style={meta}><strong>Date:</strong> {tableDate}</Text>}
    {neighborhood && <Text style={meta}><strong>Neighborhood:</strong> {neighborhood}</Text>}
    {tableId && <Text style={meta}><strong>Table ID:</strong> {tableId}</Text>}
    {guestEmail && <Text style={meta}><strong>Guest email:</strong> {guestEmail}</Text>}
    {status && <Text style={meta}><strong>Status:</strong> {status}</Text>}
    {submittedAt && <Text style={meta}><strong>Submitted:</strong> {submittedAt}</Text>}

    {message && (
      <>
        <Hr style={hr} />
        <Text style={meta}><strong>Their note</strong></Text>
        <Text style={text}>{truncate(message)}</Text>
      </>
    )}

    {adminUrl && (
      <>
        <Hr style={hr} />
        <Text style={text}>
          Open the host dashboard: <a href={adminUrl}>{adminUrl}</a>
        </Text>
      </>
    )}
  </Shell>
)

export const template = {
  component: AdminNewJoinRequestEmail,
  subject: (data: Record<string, any>) =>
    `New seat request — ${data?.tableTitle ?? 'a Colorfull table'}`,
  displayName: 'Admin · new join request',
  previewData: {
    guestName: 'Jordan Lee',
    guestEmail: 'jordan@example.com',
    tableTitle: 'Plant Forward Table',
    tableId: 'plant-forward-001',
    tableDate: 'Jun 14, 2026 · 7:00 PM',
    neighborhood: 'Venice',
    message: 'Big fan of your menu — I’d love to be there if a seat opens.',
    status: 'pending',
    submittedAt: 'Jun 1, 2026 · 7:14 PM PT',
    adminUrl: 'https://eatcolorfull.com/host/dashboard',
  },
} satisfies TemplateEntry
