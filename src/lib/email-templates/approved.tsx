import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  guestName?: string
  tableName?: string
  tableDate?: string
  payUrl?: string
}

const ApprovedEmail = ({ guestName, tableName, tableDate, payUrl }: Props) => (
  <Shell
    preview={`You're approved for ${tableName ?? 'this table'}`}
    eyebrowText="Request approved"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, you're in.` : "You're in."}
    </Heading>
    <Text style={text}>
      Your request to join {tableName ?? 'this table'} has been approved by the host.
      To lock in your seat, please complete payment.
    </Text>
    {tableDate && <Text style={meta}>Date: {tableDate}</Text>}
    {payUrl && <Text style={meta}>Complete payment: {payUrl}</Text>}
  </Shell>
)

export const template = {
  component: ApprovedEmail,
  subject: 'You\'re approved — complete your seat',
  displayName: 'Approved',
  previewData: { guestName: 'Alex', tableName: 'Sunday Supper at the Vine', tableDate: 'Sun, June 7 · 6:30 pm', payUrl: 'https://eatcolorfull.com/pay/abc' },
} satisfies TemplateEntry
