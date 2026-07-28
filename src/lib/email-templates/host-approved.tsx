import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, hr } from './_shared'

interface Props {
  name?: string
  dashboardUrl?: string
}

const HostApprovedEmail = ({ name, dashboardUrl }: Props) => (
  <Shell
    preview="You're approved to host with Colorfull Tables"
    eyebrowText="Welcome, host"
  >
    <Heading as="h1" style={h1}>
      {name ? `${name}, welcome to the table.` : 'Welcome to the table.'}
    </Heading>
    <Text style={text}>
      We're delighted to approve you as a Colorfull Tables host. You can now start
      crafting your first experience, set your dates, and invite guests to your table.
    </Text>
    <Text style={text}>
      Sign in and head to your host dashboard to publish your first listing. We'll be
      alongside you the whole way — reply to this email anytime with questions, ideas,
      or things you'd like us to look at.
    </Text>
    {dashboardUrl && (
      <>
        <Hr style={hr} />
        <Text style={text}>
          Open your host dashboard: <a href={dashboardUrl}>{dashboardUrl}</a>
        </Text>
      </>
    )}
    <Text style={text}>
      Warmly,<br />
      The Colorfull Tables team
    </Text>
  </Shell>
)

export const template = {
  component: HostApprovedEmail,
  subject: "You're approved to host — welcome to Colorfull Tables",
  displayName: 'Host approved (welcome)',
  previewData: {
    name: 'Alex',
    dashboardUrl: 'https://eatcolorfull.com/host/dashboard',
  },
} satisfies TemplateEntry
