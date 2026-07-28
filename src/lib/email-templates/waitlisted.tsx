import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  guestName?: string
  tableName?: string
  tableDate?: string
  position?: number
}

const WaitlistedEmail = ({ guestName, tableName, tableDate, position }: Props) => (
  <Shell
    preview={`You're on the waitlist for ${tableName ?? 'this table'}`}
    eyebrowText="Waitlist confirmed"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, you're on the list.` : "You're on the list."}
    </Heading>
    <Text style={text}>
      This table is currently full, but we've saved your place on the waitlist.
      We'll notify you the moment a seat opens.
    </Text>
    {tableName && <Text style={meta}>Table: {tableName}</Text>}
    {tableDate && <Text style={meta}>Date: {tableDate}</Text>}
    {typeof position === 'number' && (
      <Text style={meta}>Your position: #{position}</Text>
    )}
  </Shell>
)

export const template = {
  component: WaitlistedEmail,
  subject: 'You\'re on the waitlist',
  displayName: 'Waitlisted',
  previewData: { guestName: 'Alex', tableName: 'Sunday Supper at the Vine', tableDate: 'Sun, June 7 · 6:30 pm', position: 3 },
} satisfies TemplateEntry
