import * as React from 'react'
import { Button, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text, meta } from './_shared'

interface Props {
  pendingSteps?: string[]
  checklistUrl?: string
}

const PaymentsGoLiveReminderEmail = ({ pendingSteps, checklistUrl }: Props) => (
  <Shell
    preview="Stripe go-live still has steps left — finish to start accepting real payments"
    eyebrowText="Action required"
  >
    <Heading as="h1" style={h1}>
      Your Stripe go-live is still incomplete.
    </Heading>
    <Text style={text}>
      Real credit-card payments won't process until every go-live step is done.
      Right now anyone who tries to pay on Moshe's pizza cards gets a test-mode
      decline.
    </Text>
    {pendingSteps && pendingSteps.length > 0 && (
      <Section style={{ margin: '20px 0' }}>
        <Text style={{ ...meta, fontWeight: 600 }}>Still pending:</Text>
        {pendingSteps.map((s, i) => (
          <Text key={i} style={meta}>• {s}</Text>
        ))}
      </Section>
    )}
    <Section style={{ margin: '28px 0' }}>
      <Button
        href={checklistUrl ?? 'https://eatcolorfull.com/admin/payments-go-live'}
        style={{
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          padding: '12px 24px',
          textDecoration: 'none',
          fontSize: '13px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        Open checklist
      </Button>
    </Section>
    <Text style={meta}>
      You'll keep getting this reminder daily until you mark the checklist
      complete.
    </Text>
  </Shell>
)

export const template = {
  component: PaymentsGoLiveReminderEmail,
  subject: 'Reminder: finish Stripe go-live to accept real payments',
  displayName: 'Admin — payments go-live reminder',
  previewData: {
    pendingSteps: [
      'Step 2: Complete the go-live form on Stripe',
      'Step 3: Install the Lovable app on your LIVE account',
    ],
    checklistUrl: 'https://eatcolorfull.com/admin/payments-go-live',
  },
} satisfies TemplateEntry
