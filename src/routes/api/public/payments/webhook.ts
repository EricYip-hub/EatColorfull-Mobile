import { createFileRoute } from '@tanstack/react-router';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyWebhook, type StripeEnv } from '@/lib/stripe.server';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

const SITE_NAME = 'Colorfull Tables';
const SENDER_DOMAIN = 'notify.eatcolorfull.com';
const FROM_DOMAIN = 'eatcolorfull.com';

async function renderTemplate(name: string, data: Record<string, any>) {
  const React = await import('react');
  const { render } = await import('@react-email/components');
  const { TEMPLATES } = await import('@/lib/email-templates/registry');
  const tpl = TEMPLATES[name];
  if (!tpl) return null;
  const el = React.createElement(tpl.component, data);
  const html = await render(el);
  const text = await render(el, { plainText: true });
  const subject = typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject;
  return { html, text, subject };
}

async function enqueueEmail(supabase: SupabaseClient, opts: {
  to: string;
  templateName: string;
  data: Record<string, any>;
  idempotencyKey: string;
}) {
  try {
    const recipient = opts.to.toLowerCase().trim();
    const { data: suppressed } = await supabase
      .from('suppressed_emails').select('id').eq('email', recipient).maybeSingle();
    if (suppressed) return;

    const rendered = await renderTemplate(opts.templateName, opts.data);
    if (!rendered) return;

    const { data: existingToken } = await supabase
      .from('email_unsubscribe_tokens').select('token').eq('email', recipient).maybeSingle();
    let token = existingToken?.token as string | undefined;
    if (!token) {
      const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
      token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      await supabase.from('email_unsubscribe_tokens').upsert(
        { token, email: recipient }, { onConflict: 'email', ignoreDuplicates: true });
    }

    const messageId = crypto.randomUUID();
    await supabase.from('email_send_log').insert({
      message_id: messageId, template_name: opts.templateName,
      recipient_email: recipient, status: 'pending',
    });
    await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId, to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject: rendered.subject, html: rendered.html, text: rendered.text,
        purpose: 'transactional', label: opts.templateName,
        idempotency_key: opts.idempotencyKey,
        unsubscribe_token: token, queued_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('[webhook enqueueEmail]', opts.templateName, e);
  }
}

async function handleCheckoutCompleted(session: any) {
  const supabase = getSupabase();
  const orderId = session.metadata?.chef_order_id;
  if (!orderId) {
    console.log('[webhook] session has no chef_order_id metadata, ignoring');
    return;
  }
  const couponCode = session.metadata?.coupon_code ?? null;
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent : session.payment_intent?.id ?? null;

  // Atomic: mark paid + decrement inventory + bump coupon
  const { data: order, error } = await supabase.rpc('finalize_chef_order_paid', {
    _order_id: orderId,
    _stripe_session_id: session.id,
    _stripe_payment_intent: paymentIntentId,
    _coupon_code: couponCode,
  });
  if (error) { console.error('[webhook] finalize failed', error); return; }
  if (!order) return;

  // Capture guest contact info from Stripe checkout for SMS/email reminders
  const guestPhone = session.customer_details?.phone ?? null;
  const guestEmail = session.customer_details?.email ?? session.customer_email ?? null;
  if (guestPhone || guestEmail) {
    await supabase
      .from('chef_orders')
      .update({
        ...(guestPhone ? { guest_phone: guestPhone } : {}),
        ...(guestEmail ? { guest_email: guestEmail } : {}),
      })
      .eq('id', orderId);
  }

  // Load details for emails
  const { data: full } = await supabase
    .from('chef_orders')
    .select('*, listing:chef_listings(*), chef:chef_profiles(*)')
    .eq('id', orderId).single();
  if (!full) return;

  const listing: any = (full as any).listing;
  const chef: any = (full as any).chef;
  const amountPaid = `$${((full as any).total_cents / 100).toFixed(2)}`;
  const fulfillmentLabel = (full as any).fulfillment === 'delivery' ? 'Delivery' : 'Pickup';
  const fulfillmentDate = (full as any).fulfillment_date ?? '';

  // Customer email
  const customerEmail = session.customer_details?.email ?? session.customer_email;
  const customerName = session.customer_details?.name ?? '';
  if (customerEmail) {
    await enqueueEmail(supabase, {
      to: customerEmail,
      templateName: 'chef-order-paid',
      data: {
        guestName: customerName, listingTitle: listing?.title,
        chefName: chef?.tastemaker_id, fulfillment: fulfillmentLabel,
        fulfillmentDate, quantity: (full as any).quantity,
        amountPaid, orderId,
      },
      idempotencyKey: `chef-order-paid::${orderId}`,
    });
  }

  // Chef email
  if (chef?.user_id) {
    const { data: chefUser } = await supabase.auth.admin.getUserById(chef.user_id);
    const chefEmail = chefUser.user?.email;
    if (chefEmail) {
      await enqueueEmail(supabase, {
        to: chefEmail,
        templateName: 'chef-new-order',
        data: {
          chefName: chef.tastemaker_id, guestName: customerName,
          guestEmail: customerEmail, listingTitle: listing?.title,
          fulfillment: fulfillmentLabel, fulfillmentDate,
          quantity: (full as any).quantity,
          dietaryNotes: (full as any).dietary_notes ?? '',
          amountPaid, orderId,
        },
        idempotencyKey: `chef-new-order::${orderId}`,
      });
    }
  }
}

export const Route = createFileRoute('/api/public/payments/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get('env');
        if (rawEnv !== 'sandbox' && rawEnv !== 'live') {
          console.error('[webhook] invalid env query parameter:', rawEnv);
          return Response.json({ received: true, ignored: 'invalid env' });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
              await handleCheckoutCompleted(event.data.object);
              break;
            default:
              console.log('[webhook] unhandled event:', event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error('[webhook] error', e);
          return new Response('Webhook error', { status: 400 });
        }
      },
    },
  },
});
