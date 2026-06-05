import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
const MERCHANT_ID = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ?? '';

export function AppStripeProvider({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider publishableKey={STRIPE_PK} merchantIdentifier={MERCHANT_ID}>
      {children}
    </StripeProvider>
  );
}
