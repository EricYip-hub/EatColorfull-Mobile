import * as React from 'react'
import { Button, Img, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface MenuItem {
  name: string
  price?: number
  description?: string
}

interface Props {
  eventTitle: string
  chefName?: string
  dateLabel?: string
  pickupAddress?: string
  coverUrl?: string
  description?: string
  menu?: MenuItem[]
  url: string
  personalNote?: string
  hostFirstName?: string
}

const button: React.CSSProperties = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  padding: '14px 28px',
  display: 'inline-block',
  borderRadius: 0,
}

const cover: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  marginBottom: '24px',
  objectFit: 'cover',
}

const ChefEventInviteEmail = ({
  eventTitle,
  chefName,
  dateLabel,
  pickupAddress,
  coverUrl,
  description,
  menu,
  url,
  personalNote,
  hostFirstName,
}: Props) => {
  const greeting = hostFirstName ? `From ${hostFirstName}` : 'A personal invitation'
  return (
    <Shell
      preview={`You're invited — ${eventTitle}${dateLabel ? ` · ${dateLabel}` : ''}`}
      eyebrowText="🍽 Colorfull Tables · Private Invitation"
    >
      {coverUrl ? (
        <Section>
          <Img src={coverUrl} alt={eventTitle} style={cover} />
        </Section>
      ) : null}

      <Text style={{ ...meta, marginBottom: 12 }}>{greeting}</Text>
      <Heading as="h1" style={h1}>
        You're invited to {eventTitle}.
      </Heading>

      {personalNote ? (
        <Text style={{ ...text, fontStyle: 'italic', color: '#5a534a' }}>
          "{personalNote}"
        </Text>
      ) : null}

      {description ? <Text style={text}>{description}</Text> : null}

      <Hr style={hr} />

      {chefName ? (
        <Text style={meta}><strong>Chef:</strong> {chefName}</Text>
      ) : null}
      {dateLabel ? (
        <Text style={meta}><strong>When:</strong> {dateLabel}</Text>
      ) : null}
      {pickupAddress ? (
        <Text style={meta}><strong>Where:</strong> {pickupAddress}</Text>
      ) : null}

      {Array.isArray(menu) && menu.length > 0 ? (
        <>
          <Hr style={hr} />
          <Text style={meta}><strong>On the menu</strong></Text>
          {menu.slice(0, 12).map((m, i) => (
            <Text key={i} style={{ ...text, margin: '0 0 6px' }}>
              · {m.name}
              {typeof m.price === 'number' ? ` — $${m.price}` : ''}
              {m.description ? ` — ${m.description}` : ''}
            </Text>
          ))}
        </>
      ) : null}

      <Hr style={hr} />

      <Section style={{ textAlign: 'center', margin: '8px 0 8px' }}>
        <Button href={url} style={button}>
          Reserve your seat
        </Button>
      </Section>
      <Text style={{ ...meta, textAlign: 'center' as const }}>
        Or open: <a href={url} style={{ color: '#5a534a' }}>{url}</a>
      </Text>

      <Hr style={hr} />
      <Text style={text}>
        Seats are limited and these pop-ups tend to fill quickly. Reply to this email
        if you have questions — we'd love to see you at the table.
      </Text>
    </Shell>
  )
}

export const template = {
  component: ChefEventInviteEmail,
  subject: (data: Record<string, any>) =>
    `You're invited — ${data?.eventTitle ?? 'a Colorfull pop-up'}${data?.dateLabel ? ` · ${data.dateLabel}` : ''}`,
  displayName: 'Chef event · guest invitation',
  previewData: {
    eventTitle: 'Sunday Supper at Moshe\'s',
    chefName: 'Chef Moshe Fhima',
    dateLabel: 'Sunday, June 15 · 7:00 PM',
    pickupAddress: '1037 S Sherbourne Dr, Los Angeles, CA',
    description: 'An intimate Neapolitan pizza night with house-fermented dough and seasonal toppings.',
    menu: [
      { name: 'Margherita', price: 22 },
      { name: 'La Bianca', price: 24 },
      { name: 'Nutella Calzone', price: 14 },
    ],
    url: 'https://eatcolorfull.com/e/sunday-supper',
    personalNote: 'Saved you a seat — would love to have you there.',
    hostFirstName: 'Moshe',
  },
} satisfies TemplateEntry
