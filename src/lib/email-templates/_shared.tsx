import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Hr,
} from '@react-email/components'

export const SITE_NAME = 'Colorfull Tables'

export const main: React.CSSProperties = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, "Cormorant Garamond", serif',
  margin: 0,
  padding: 0,
}
export const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '40px 28px',
}
export const eyebrow: React.CSSProperties = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: '#7a6f63',
  margin: '0 0 18px',
}
export const h1: React.CSSProperties = {
  fontFamily: 'Georgia, "Cormorant Garamond", serif',
  fontSize: '32px',
  lineHeight: '1.15',
  color: '#1a1a1a',
  margin: '0 0 18px',
  fontWeight: 500,
}
export const text: React.CSSProperties = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#3d3a36',
  margin: '0 0 16px',
}
export const meta: React.CSSProperties = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '13px',
  color: '#7a6f63',
  margin: '0 0 6px',
}
export const hr: React.CSSProperties = {
  borderColor: '#e8e3da',
  margin: '28px 0',
}
export const footer: React.CSSProperties = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '12px',
  color: '#9a9088',
  margin: '24px 0 0',
}

export function Shell({
  preview, eyebrowText, children,
}: { preview: string; eyebrowText: string; children: React.ReactNode }) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>{eyebrowText}</Text>
          {children}
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} — Curated communal dining.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export { Heading, Text, Section, Hr }
