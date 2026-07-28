import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  guestName?: string
  tableName?: string
  tableDate?: string
  payUrl?: string
  payByHours?: number
}

const PromotedEmail = ({ guestName, tableName, tableDate, payUrl, payByHours = 24 }: Props) => (
  <Shell
    preview={`A seat just opened at ${tableName ?? 'your waitlisted table'}`}
    eyebrowText="A seat opened"
  >
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, a seat is yours.` : 'A seat is yours.'}
    </Heading>
    <Text style={text}>
      A spot just opened at {tableName ?? 'the table'} and we've moved you off the waitlist.
      Please complete payment within {payByHours} hours to keep your seat.
    </Text>
    {tableDate && <Text style={meta}>Date: {tableDate}</Text>}
    {payUrl && <Text style={meta}>Complete payment: {payUrl}</Text>}
  </Shell>
)

export const template = {
  component: PromotedEmail,
  subject: 'A seat just opened — claim it now',
  displayName: 'Promoted from waitlist',
  previewData: { guestName: 'Alex', tableName: 'Sunday Supper at the Vine', tableDate: 'Sun, June 7 · 6:30 pm', payUrl: 'https://eatcolorfull.com/pay/abc', payByHours: 24 },
} satisfies TemplateEntry
