import { supabase } from "@/integrations/supabase/client";

export interface PaymentProvider {
  id: 'stripe' | 'fondy' | 'wise';
  name: string;
  enabled: boolean;
  embeddedSupported: boolean;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  externalId?: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
}

export const getAvailablePaymentProviders = (): PaymentProvider[] => {
  // Get from environment variables (feature flags)
  const stripeEnabled = true; // Default enabled for this demo
  const fondyEnabled = false; // Feature flag controlled
  const wiseEnabled = false; // Optional for later
  
  return [
    {
      id: 'stripe' as const,
      name: 'Stripe',
      enabled: stripeEnabled,
      embeddedSupported: true,
    },
    {
      id: 'fondy' as const,
      name: 'Fondy',
      enabled: fondyEnabled,
      embeddedSupported: true,
    },
    {
      id: 'wise' as const,
      name: 'Wise',
      enabled: wiseEnabled,
      embeddedSupported: false,
    },
  ].filter(provider => provider.enabled);
};

export const createPaymentIntent = async (
  provider: PaymentProvider,
  amount: number,
  entryId: string,
  competitionId: string
): Promise<PaymentIntent> => {
  console.log('Creating payment intent:', { provider: provider.id, amount, entryId });
  
  switch (provider.id) {
    case 'stripe':
      return createStripePaymentIntent(amount, entryId, competitionId);
    case 'fondy':
      return createFondyPaymentIntent(amount, entryId, competitionId);
    default:
      throw new Error(`Payment provider ${provider.id} not supported for embedded payments`);
  }
};

const createStripePaymentIntent = async (
  amount: number,
  entryId: string,
  competitionId: string
): Promise<PaymentIntent> => {
  // This would integrate with Stripe's API via an Edge Function
  // For now, simulate the payment intent creation
  const paymentIntent: PaymentIntent = {
    id: `pi_${Math.random().toString(36).substring(2, 15)}`,
    amount,
    currency: 'gbp',
    clientSecret: `pi_${Math.random().toString(36).substring(2, 15)}_secret`,
    status: 'pending',
  };
  
  console.log('Stripe payment intent created:', paymentIntent);
  return paymentIntent;
};

const createFondyPaymentIntent = async (
  amount: number,
  entryId: string,
  competitionId: string
): Promise<PaymentIntent> => {
  // This would integrate with Fondy's API via an Edge Function
  // For now, simulate the payment intent creation
  const paymentIntent: PaymentIntent = {
    id: `fondy_${Math.random().toString(36).substring(2, 15)}`,
    amount,
    currency: 'gbp',
    externalId: `order_${entryId}`,
    status: 'pending',
  };
  
  console.log('Fondy payment intent created:', paymentIntent);
  return paymentIntent;
};

export const confirmPayment = async (
  provider: PaymentProvider,
  paymentIntent: PaymentIntent,
  paymentMethodId?: string
): Promise<{ success: boolean; error?: string }> => {
  console.log('Confirming payment:', { provider: provider.id, paymentIntent });
  
  try {
    switch (provider.id) {
      case 'stripe':
        return confirmStripePayment(paymentIntent, paymentMethodId);
      case 'fondy':
        return confirmFondyPayment(paymentIntent);
      default:
        return { success: false, error: `Payment provider ${provider.id} not supported` };
    }
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Payment failed' };
  }
};

const confirmStripePayment = async (
  paymentIntent: PaymentIntent,
  paymentMethodId?: string
): Promise<{ success: boolean; error?: string }> => {
  // For demo purposes, simulate successful payment
  // In real implementation, this would use Stripe's confirmCardPayment
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
  
  const success = Math.random() > 0.1; // 90% success rate for demo
  
  if (success) {
    return { success: true };
  } else {
    return { success: false, error: 'Card was declined' };
  }
};

const confirmFondyPayment = async (
  paymentIntent: PaymentIntent
): Promise<{ success: boolean; error?: string }> => {
  // For demo purposes, simulate successful payment
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
  
  const success = Math.random() > 0.1; // 90% success rate for demo
  
  if (success) {
    return { success: true };
  } else {
    return { success: false, error: 'Payment processing failed' };
  }
};

export const updateEntryPaymentInfo = async (
  entryId: string,
  paymentProvider: string,
  paymentIntentId: string,
  amountMinor: number
) => {
  const { error } = await supabase
    .from('entries')
    .update({
      payment_provider: paymentProvider,
      paid: true,
      payment_date: new Date().toISOString(),
      amount_minor: amountMinor,
    })
    .eq('id', entryId);

  if (error) {
    console.error('Failed to update entry payment info:', error);
    throw error;
  }
};