import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  chefName?: string
  guestName?: string
  guestEmail?: string
  listingTitle?: string
  fulfillment?: string
  fulfillmentDate?: string
  quantity?: number
  amountPaid?: string
  dietaryNotes?: string
  orderId?: string
}

const ChefNewOrderEmail = ({
  chefName,
  guestName,
  guestEmail,
  listingTitle,
  fulfillment,
  fulfillmentDate,
  quantity,
  amountPaid,
  dietaryNotes,
  orderId,
}: Props) => (
  <Shell preview={`New paid order: ${listingTitle ?? 'chef listing'}`} eyebrowText="New paid order">
    <Heading as="h1" style={h1}>
      {chefName ? `Chef ${chefName}, you have a new order.` : 'You have a new order.'}
    </Heading>
    <Text style={text}>
      A guest just paid for one of your listings. Please confirm fulfillment details with them.
    </Text>
    {listingTitle && <Text style={meta}>Listing: {listingTitle}{quantity ? ` × ${quantity}` : ''}</Text>}
    {guestName && <Text style={meta}>Guest: {guestName}{guestEmail ? ` (${guestEmail})` : ''}</Text>}
    {fulfillment && <Text style={meta}>Fulfillment: {fulfillment}{fulfillmentDate ? ` · ${fulfillmentDate}` : ''}</Text>}
    {dietaryNotes && <Text style={meta}>Dietary notes: {dietaryNotes}</Text>}
    {amountPaid && <Text style={meta}>Paid: {amountPaid}</Text>}
    {orderId && <Text style={meta}>Order ID: {orderId}</Text>}
  </Shell>
)

export const template = {
  component: ChefNewOrderEmail,
  subject: 'New paid order on Colorfull',
  displayName: 'Chef — new paid order',
  previewData: {
    chefName: 'Marisol',
    guestName: 'Alex',
    guestEmail: 'alex@example.com',
    listingTitle: 'Sunday Meal Prep',
    fulfillment: 'Pickup',
    fulfillmentDate: 'Sun, June 14',
    quantity: 2,
    amountPaid: '$84.00',
    dietaryNotes: 'No dairy',
    orderId: 'abc-123',
  },
} satisfies TemplateEntry
