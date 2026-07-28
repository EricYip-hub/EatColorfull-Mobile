import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createStripeClient, getStripeErrorMessage, type StripeEnv } from '@/lib/stripe.server';

// Prepared food / catering tax codes. Both categories are tangible — Stripe
// "managed_payments" (full compliance handling) does NOT cover these, so we
// use `automatic_tax` (calculation & collection) instead. The seller handles
// filing & remittance.
const TAX_CODE_BY_KIND: Record<string, string> = {
  meal_prep: 'txcd_40050001',       // Prepared food
  hosted_table: 'txcd_40060000',    // Catering service
  private_dining: 'txcd_40060000',  // Catering service
};

const inputSchema = z.object({
  orderId: z.string().uuid(),
  returnUrl: z.string().url(),
  environment: z.enum(['sandbox', 'live']),
});

type Result = { clientSecret: string } | { error: string };

export const createChefCheckoutSession = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<Result> => {
    try {
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const env = data.environment as StripeEnv;

      // Load order + listing + chef
      const { data: order, error: orderErr } = await supabaseAdmin
        .from('chef_orders')
        .select('*, listing:chef_listings(*), chef:chef_profiles(*)')
        .eq('id', data.orderId)
        .single();
      if (orderErr || !order) return { error: 'Order not found' };
      if (order.payment_status === 'paid') return { error: 'Order is already paid' };

      const listing: any = order.listing;
      const chef: any = order.chef;
      if (!listing || !chef) return { error: 'Listing or chef missing' };
      if ((order.total_cents ?? 0) < 50) return { error: 'Order total too small' };

      // Lookup customer email
      const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      const customerEmail = userInfo.user?.email ?? undefined;

      const stripe = createStripeClient(env);

      // Resolve / create Stripe customer with userId metadata for searchability
      let customerId: string | undefined;
      const safeUserId = /^[a-zA-Z0-9_-]+$/.test(order.user_id) ? order.user_id : null;
      if (safeUserId) {
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${safeUserId}'`,
          limit: 1,
        });
        if (found.data.length) customerId = found.data[0].id;
      }
      if (!customerId && customerEmail) {
        const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (existing.data.length) {
          customerId = existing.data[0].id;
          if (safeUserId && existing.data[0].metadata?.userId !== safeUserId) {
            await stripe.customers.update(customerId, {
              metadata: { ...existing.data[0].metadata, userId: safeUserId },
            });
          }
        }
      }
      if (!customerId) {
        const created = await stripe.customers.create({
          ...(customerEmail && { email: customerEmail }),
          ...(safeUserId && { metadata: { userId: safeUserId } }),
        });
        customerId = created.id;
      }

      const unitPrice = Math.round((order.total_cents ?? 0) / Math.max(1, order.quantity ?? 1));
      const productName = `${listing.title}`;
      const productDescription = listing.description ? String(listing.description).slice(0, 350) : undefined;
      const taxCode = TAX_CODE_BY_KIND[listing.kind as string] ?? 'txcd_40050001';

      // Suppress unused-var warning: taxCode retained for future automatic_tax re-enablement.
      void taxCode;

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: (listing.currency ?? 'USD').toLowerCase(),
              product_data: {
                name: productName,
                ...(productDescription && { description: productDescription }),
              },
              unit_amount: unitPrice,
            },
            quantity: order.quantity ?? 1,
          },
        ],
        mode: 'payment',
        ui_mode: 'embedded_page',
        return_url: data.returnUrl,
        customer: customerId,
        phone_number_collection: { enabled: true },
        payment_intent_data: {
          description: productName,
          metadata: {
            chef_order_id: order.id,
            chef_id: chef.id,
            listing_id: listing.id,
          },
        },
        metadata: {
          chef_order_id: order.id,
          chef_id: chef.id,
          listing_id: listing.id,
          userId: order.user_id,
          ...(order.coupon_code && { coupon_code: order.coupon_code }),
        },
      });

      // Persist session id so webhook (or refresh) can match by either lookup
      await supabaseAdmin
        .from('chef_orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);

      return { clientSecret: session.client_secret ?? '' };
    } catch (error) {
      console.error('[createChefCheckoutSession]', error);
      return { error: getStripeErrorMessage(error) };
    }
  });
