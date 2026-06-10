export type ApplePayError = { code: string; message?: string };

export function useApplePay() {
  return {
    isApplePaySupported: false as boolean,
    presentApplePay: async (_opts: unknown) => ({ error: null }),
    confirmApplePayPayment: async (_secret: string) => ({ error: null }),
  };
}
