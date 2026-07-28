import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface Props {
  guestName?: string
  pickupTime?: string
  pickupDateLabel?: string
  eventLabel?: string
  margheritaQty?: number
  margheritaAddons?: string
  biancaQty?: number
  biancaAddons?: string
  pastaQty?: number
  pastaAddons?: string
  calzoneQty?: number
  notes?: string
  amountDue?: string
}

const MolinoOrderConfirmationEmail = ({
  guestName,
  pickupTime,
  pickupDateLabel,
  eventLabel,
  margheritaQty,
  margheritaAddons,
  biancaQty,
  biancaAddons,
  pastaQty,
  pastaAddons,
  calzoneQty,
  notes,
  amountDue,
}: Props) => {
  const dateLine = pickupDateLabel || 'Wednesday, June 3, 2026 · 12:30–4:30 PM'
  const eventName = eventLabel || 'Molino Neapolitan Pizza Pop-Up'
  return (
    <Shell
      preview={`Your ${eventName} pre-order is confirmed${pickupTime ? ` for ${pickupTime}` : ''}`}
      eyebrowText="🍅 Molino · Neapolitan Pizza Pop-Up"
    >
      <Heading as="h1" style={h1}>
        {guestName ? `Grazie, ${guestName}!` : 'Grazie!'} Your order is locked in.
      </Heading>
      <Text style={text}>
        We've received your pre-order for the {eventName} with Chef Moshe Fhima — {dateLine}.
      </Text>
      <Text style={text}>
        Chef Moshe will fire your order so it's ready right at your pickup time —
        hot from the wood oven and best eaten within 15 minutes. 🔥🍕
      </Text>

      <Hr style={hr} />

      {pickupTime && <Text style={meta}><strong>Pickup time:</strong> {pickupTime}</Text>}
      <Text style={meta}>
        <strong>Pickup address:</strong>{' '}
        <a
          href="https://maps.google.com/?q=1037+S+Sherbourne+Dr,+Los+Angeles,+CA"
          style={{ color: 'inherit' }}
        >
          1037 S Sherbourne Dr, Los Angeles, CA
        </a>
      </Text>
      {amountDue && <Text style={meta}><strong>Total:</strong> {amountDue}</Text>}

      <Hr style={hr} />

      <Text style={meta}><strong>Your order</strong></Text>
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
          {pastaQty} × Fusilloni alla Vodka (organic, Di Gragnano IGP)
          {pastaAddons ? ` — add-on: ${pastaAddons}` : ''}
        </Text>
      ) : null}
      {calzoneQty ? (
        <Text style={text}>
          {calzoneQty} × Nutella Calzone
        </Text>
      ) : null}

      {notes && (
        <>
          <Hr style={hr} />
          <Text style={meta}><strong>Your notes</strong></Text>
          <Text style={text}>{notes}</Text>
        </>
      )}

      <Hr style={hr} />
      <Text style={text}>
        Questions? Just reply to this email and we'll be in touch. See you soon!
        — A Colorfull Table experience
      </Text>
    </Shell>
  )
}

export const template = {
  component: MolinoOrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    `🍅 Your Molino pizza order is confirmed${data?.pickupTime ? ` — pickup ${data.pickupTime}` : ''}`,
  displayName: 'Molino · guest order confirmation',
  previewData: {
    guestName: 'Jordan',
    pickupTime: '1:30 PM',
    margheritaQty: 2,
    margheritaAddons: 'Mushrooms, Olives',
    biancaQty: 1,
    amountDue: '$83.00',
  },
} satisfies TemplateEntry
