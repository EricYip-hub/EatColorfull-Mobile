import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  guestName?: string
  tableName?: string
  tableDate?: string
  tableAddress?: string
  amountPaid?: string
}

const PaidEmail = ({ guestName, tableName, tableDate, tableAddress, amountPaid }: Props) => (
  <Shell
    preview={`Your seat is confirmed at ${tableName ?? 'the table'}`}
    eyebrowText="Seat confirmed"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, see you at the table.` : 'See you at the table.'}
    </Heading>
    <Text style={text}>
      Your payment is received and your seat is confirmed. We can't wait to host you.
    </Text>
    {tableName && <Text style={meta}>Table: {tableName}</Text>}
    {tableDate && <Text style={meta}>When: {tableDate}</Text>}
    {tableAddress && <Text style={meta}>Where: {tableAddress}</Text>}
    {amountPaid && <Text style={meta}>Paid: {amountPaid}</Text>}
  </Shell>
)

export const template = {
  component: PaidEmail,
  subject: 'Your seat is confirmed',
  displayName: 'Paid / Confirmed',
  previewData: { guestName: 'Alex', tableName: 'Sunday Supper at the Vine', tableDate: 'Sun, June 7 · 6:30 pm', tableAddress: 'Sonoma, CA (full address shared 24h prior)', amountPaid: '$85.00' },
} satisfies TemplateEntry
