import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface Props {
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  guestAge?: string | number
  guestCount?: number
  dietaryNotes?: string
  couponCode?: string
  amountDue?: string
  submittedAt?: string
}

const IrieRsvpNotificationEmail = ({
  guestName,
  guestEmail,
  guestPhone,
  guestAge,
  guestCount,
  dietaryNotes,
  couponCode,
  amountDue,
  submittedAt,
}: Props) => (
  <Shell
    preview={`New Irie Supper Club RSVP${guestName ? ` from ${guestName}` : ''}`}
    eyebrowText="New Irie Supper Club RSVP"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName} just RSVP'd.` : 'A new guest just RSVP\'d.'}
    </Heading>
    <Text style={text}>
      A new reservation for the Irie Supper Club (Wednesday, June 3, 2026) has
      been submitted.
    </Text>

    <Hr style={hr} />

    {guestName && <Text style={meta}><strong>Name:</strong> {guestName}</Text>}
    {guestEmail && <Text style={meta}><strong>Email:</strong> {guestEmail}</Text>}
    {guestPhone && <Text style={meta}><strong>Phone:</strong> {guestPhone}</Text>}
    {guestAge && <Text style={meta}><strong>Age:</strong> {guestAge}</Text>}
    {guestCount && <Text style={meta}><strong>Guests:</strong> {guestCount}</Text>}
    {couponCode && <Text style={meta}><strong>Coupon:</strong> {couponCode}</Text>}
    {amountDue && <Text style={meta}><strong>Amount due:</strong> {amountDue}</Text>}
    {submittedAt && <Text style={meta}><strong>Submitted:</strong> {submittedAt}</Text>}

    {dietaryNotes && (
      <>
        <Hr style={hr} />
        <Text style={meta}><strong>Dietary notes</strong></Text>
        <Text style={text}>{dietaryNotes}</Text>
      </>
    )}
  </Shell>
)

export const template = {
  component: IrieRsvpNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New Irie Supper Club RSVP — ${data?.guestName ?? 'guest'}`,
  displayName: 'Irie · new RSVP notification',
  previewData: {
    guestName: 'Jordan Lee',
    guestEmail: 'jordan@example.com',
    guestPhone: '+1 555 123 4567',
    guestAge: 32,
    guestCount: 2,
    dietaryNotes: 'No shellfish, please.',
    couponCode: 'IRIE2026',
    amountDue: '$0.00',
    submittedAt: 'Jun 1, 2026 · 7:14 PM PT',
  },
} satisfies TemplateEntry
