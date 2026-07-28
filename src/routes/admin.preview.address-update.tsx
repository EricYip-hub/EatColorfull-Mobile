import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'

export const previewAddressUpdate = createServerFn({ method: 'GET' })
  .handler(async () => {
    const React = await import('react')
    const { render } = await import('@react-email/components')
    const { TEMPLATES } = await import('@/lib/email-templates/registry')

    const tpl = TEMPLATES['address-update']
    if (!tpl) {
      throw new Error('Template not found: address-update')
    }

    const templateData = { guestName: 'Jane' }
    const element = React.createElement(tpl.component, templateData)
    const html = await render(element)
    const subject = typeof tpl.subject === 'function' ? tpl.subject(templateData) : tpl.subject

    return {
      subject,
      html,
      recipient: 'jane@example.com',
      sampleData: templateData,
    }
  })

export const Route = createFileRoute('/admin/preview/address-update')({
  loader: () => previewAddressUpdate(),
  component: PreviewPage,
})

function PreviewPage() {
  const data = Route.useLoaderData()

  return (
    <div className="min-h-screen bg-neutral-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-xl font-semibold text-neutral-900">Email Preview</h1>
          <div className="space-y-3 text-sm text-neutral-700">
            <div><strong>Template:</strong> address-update</div>
            <div><strong>Recipient:</strong> {data.recipient}</div>
            <div><strong>Subject:</strong> {data.subject}</div>
            <div><strong>Sample data:</strong> <pre className="mt-1 rounded bg-neutral-50 p-2 text-xs">{JSON.stringify(data.sampleData, null, 2)}</pre></div>
          </div>
        </div>

        <div className="rounded-lg border bg-white shadow-sm">
          <div className="border-b bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-500">Rendered HTML</div>
          <div
            className="p-4"
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        </div>
      </div>
    </div>
  )
}