import * as React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Heading, Text, Hr, h1, text, meta, hr } from './_shared'

interface Props {
  name?: string
  email?: string
  phone?: string
  location?: string
  instagram?: string
  experienceType?: string
  guestCount?: number | string
  locationStatus?: string
  motivation?: string
  background?: string
  sampleMenu?: string
  submittedAt?: string
  adminUrl?: string
}

const truncate = (s: string | undefined, n = 600) =>
  !s ? '' : s.length > n ? `${s.slice(0, n)}…` : s

const AdminNewHostApplicationEmail = ({
  name,
  email,
  phone,
  location,
  instagram,
  experienceType,
  guestCount,
  locationStatus,
  motivation,
  background,
  sampleMenu,
  submittedAt,
  adminUrl,
}: Props) => (
  <Shell
    preview={`New host application from ${name ?? 'a prospective host'}`}
    eyebrowText="New host application"
  >
    <Heading as="h1" style={h1}>
      {name ? `${name} just applied to host.` : 'A new host just applied.'}
    </Heading>
    <Text style={text}>
      A new application is waiting in the admin queue. Review and respond when you can.
    </Text>

    <Hr style={hr} />

    {email && <Text style={meta}><strong>Email:</strong> {email}</Text>}
    {phone && <Text style={meta}><strong>Phone:</strong> {phone}</Text>}
    {location && <Text style={meta}><strong>Location:</strong> {location}</Text>}
    {instagram && <Text style={meta}><strong>Instagram:</strong> {instagram}</Text>}
    {experienceType && <Text style={meta}><strong>Experience type:</strong> {experienceType}</Text>}
    {guestCount !== undefined && guestCount !== '' && (
      <Text style={meta}><strong>Guest count:</strong> {guestCount}</Text>
    )}
    {locationStatus && <Text style={meta}><strong>Location status:</strong> {locationStatus}</Text>}
    {submittedAt && <Text style={meta}><strong>Submitted:</strong> {submittedAt}</Text>}

    {motivation && (
      <>
        <Hr style={hr} />
        <Text style={meta}><strong>Why they want to host</strong></Text>
        <Text style={text}>{truncate(motivation)}</Text>
      </>
    )}
    {background && (
      <>
        <Text style={meta}><strong>Background</strong></Text>
        <Text style={text}>{truncate(background)}</Text>
      </>
    )}
    {sampleMenu && (
      <>
        <Text style={meta}><strong>Sample menu</strong></Text>
        <Text style={text}>{truncate(sampleMenu)}</Text>
      </>
    )}

    {adminUrl && (
      <>
        <Hr style={hr} />
        <Text style={text}>
          Open the admin dashboard: <a href={adminUrl}>{adminUrl}</a>
        </Text>
      </>
    )}
  </Shell>
)

export const template = {
  component: AdminNewHostApplicationEmail,
  subject: (data: Record<string, any>) =>
    `New host application — ${data?.name ?? 'unnamed applicant'}`,
  displayName: 'Admin · new host application',
  previewData: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '+1 555 0100',
    location: 'Venice, CA',
    instagram: '@alexcooks',
    experienceType: 'Plant Forward Table',
    guestCount: 8,
    locationStatus: 'Own a home with a private dining room',
    motivation: 'I want to bring my supper club to a wider community of curious eaters.',
    background: 'Trained at SALT, cooked for pop-ups in LA for 4 years.',
    sampleMenu: 'Smoked carrot, citrus mole, koji-cured radish, olive oil cake.',
    submittedAt: 'Jun 1, 2026 · 7:14 PM PT',
    adminUrl: 'https://eatcolorfull.com/admin/reviews',
  },
} satisfies TemplateEntry
