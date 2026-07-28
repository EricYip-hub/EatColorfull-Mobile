import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, h1, text } from './_shared'

interface Props {
  name?: string
}

const HostApplicationReceivedEmail = ({ name }: Props) => (
  <Shell
    preview="We received your host application"
    eyebrowText="Application received"
  >
    <Heading as="h1" style={h1}>
      {name ? `Thank you, ${name}.` : 'Thank you.'}
    </Heading>
    <Text style={text}>
      Your application to host a Colorfull table has arrived. We read every application
      personally and will be in touch within 24 hours with next steps.
    </Text>
    <Text style={text}>
      In the meantime, feel free to reply to this email with anything you'd like us to know.
    </Text>
  </Shell>
)

export const template = {
  component: HostApplicationReceivedEmail,
  subject: 'We received your host application — Colorfull',
  displayName: 'Host application received',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry
