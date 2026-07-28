import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface Props {
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  pickupTime?: string
  pickupDateLabel?: string
  eventLabel?: string
  orderSummary?: string
  margheritaQty?: number
  margheritaAddons?: string
  biancaQty?: number
  biancaAddons?: string
  pastaQty?: number
  pastaAddons?: string
  calzoneQty?: number
  notes?: string
  amountDue?: string
  submittedAt?: string
}

const MolinoOrderNotificationEmail = ({
  guestName,
  guestEmail,
  guestPhone,
  pickupTime,
  pickupDateLabel,
  eventLabel,
  orderSummary,
  margheritaQty,
  margheritaAddons,
  biancaQty,
  biancaAddons,
  pastaQty,
  pastaAddons,
  calzoneQty,
  notes,
  amountDue,
  submittedAt,
}: Props) => {
  const dateLine = pickupDateLabel || 'Wednesday, June 3 · 12:30–4:30 PM'
  const eventName = eventLabel || 'Molino Neapolitan Pizza Pop-Up'
  return (
    <Shell
      preview={`New ${eventName} pre-order${guestName ? ` from ${guestName}` : ''}`}
      eyebrowText="Molino · Neapolitan Pizza Pop-Up"
    >
      <Heading as="h1" style={h1}>
        {guestName ? `${guestName} just placed an order.` : 'A new order came in.'}
      </Heading>
      <Text style={text}>
        A new pre-order for the {eventName} ({dateLine}) has been submitted.
      </Text>

      <Hr style={hr} />

      {guestName && <Text style={meta}><strong>Name:</strong> {guestName}</Text>}
      {guestEmail && <Text style={meta}><strong>Email:</strong> {guestEmail}</Text>}
      {guestPhone && <Text style={meta}><strong>Phone:</strong> {guestPhone}</Text>}
      {pickupTime && <Text style={meta}><strong>Pickup time:</strong> {pickupTime}</Text>}
      {amountDue && <Text style={meta}><strong>Total:</strong> {amountDue}</Text>}
      {submittedAt && <Text style={meta}><strong>Submitted:</strong> {submittedAt}</Text>}

      <Hr style={hr} />

      <Text style={meta}><strong>Order</strong></Text>
      {margheritaQty ? (
        <Text style={text}>
          {margheritaQty} × Margherita Pizza
          {margheritaAddons ? ` — add-ons: ${margheritaAddons}` : ''}
        </Text>
      ) : null}
      {biancaQty ? (
        <Text style={text}>
          {biancaQty} × La Bianca Pizza
          {biancaAddons ? ` — add-ons: ${biancaAddons}` : ''}
        </Text>
      ) : null}
      {pastaQty ? (
        <Text style={text}>
          {pastaQty} × Fusilloni alla Vodka
          {pastaAddons ? ` — add-on: ${pastaAddons}` : ''}
        </Text>
      ) : null}
      {calzoneQty ? (
        <Text style={text}>
          {calzoneQty} × Nutella Calzone
        </Text>
      ) : null}
      {orderSummary && <Text style={text}>{orderSummary}</Text>}

      {notes && (
        <>
          <Hr style={hr} />
          <Text style={meta}><strong>Notes from the guest</strong></Text>
          <Text style={text}>{notes}</Text>
        </>
      )}
    </Shell>
  )
}

export const template = {
  component: MolinoOrderNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New Molino pizza order — ${data?.guestName ?? 'guest'}`,
  displayName: 'Molino · new pizza order',
  previewData: {
    guestName: 'Jordan Lee',
    guestEmail: 'jordan@example.com',
    guestPhone: '+1 555 123 4567',
    pickupTime: '1:30 PM',
    margheritaQty: 2,
    margheritaAddons: 'Mushrooms, Olives',
    biancaQty: 1,
    biancaAddons: 'Mushrooms',
    amountDue: '$83.00',
    submittedAt: 'Jun 2, 2026 · 9:14 AM PT',
  },
} satisfies TemplateEntry
