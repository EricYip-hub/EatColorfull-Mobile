import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  guestName?: string
  listingTitle?: string
  chefName?: string
  fulfillment?: string
  fulfillmentDate?: string
  quantity?: number
  amountPaid?: string
  orderId?: string
}

const ChefOrderPaidEmail = ({
  guestName,
  listingTitle,
  chefName,
  fulfillment,
  fulfillmentDate,
  quantity,
  amountPaid,
  orderId,
}: Props) => (
  <Shell preview={`Order confirmed: ${listingTitle ?? 'your chef order'}`} eyebrowText="Order confirmed">
    <Heading as="h1" style={h1}>
      {guestName ? `${guestName}, your order is in.` : 'Your order is in.'}
    </Heading>
    <Text style={text}>
      Thank you for supporting{chefName ? ` Chef ${chefName}` : ' your chef'}. Your payment is received and the chef has been notified.
    </Text>
    <Text style={text}>
      <strong>All food is purchased and curated with the intention you will show up. No refunds.</strong>
    </Text>
    {listingTitle && <Text style={meta}>Order: {listingTitle}{quantity ? ` × ${quantity}` : ''}</Text>}
    {fulfillment && <Text style={meta}>Fulfillment: {fulfillment}{fulfillmentDate ? ` · ${fulfillmentDate}` : ''}</Text>}
    {amountPaid && <Text style={meta}>Paid: {amountPaid}</Text>}
    {orderId && <Text style={meta}>Order ID: {orderId}</Text>}
  </Shell>
)

export const template = {
  component: ChefOrderPaidEmail,
  subject: 'Your chef order is confirmed',
  displayName: 'Chef order — paid (customer)',
  previewData: {
    guestName: 'Alex',
    listingTitle: 'Sunday Meal Prep',
    chefName: 'Marisol',
    fulfillment: 'Pickup',
    fulfillmentDate: 'Sun, June 14',
    quantity: 2,
    amountPaid: '$84.00',
    orderId: 'abc-123',
  },
} satisfies TemplateEntry
