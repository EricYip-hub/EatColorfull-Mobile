import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createChefCheckoutSession } from '@/lib/chef-checkout.functions';

type Props = {
  orderId: string;
  returnUrl: string;
};

export function StripeEmbeddedCheckoutPanel({ orderId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createChefCheckoutSession({
      data: { orderId, returnUrl, environment: getStripeEnvironment() },
    });
    if ('error' in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error('Stripe did not return a client secret');
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="min-h-[420px]">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
