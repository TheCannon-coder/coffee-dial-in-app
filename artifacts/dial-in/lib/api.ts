const API_BASE = 'https://www.coffeebrew.coach/api';

export interface DialInParams {
  email?: string;
  anonId?: string;
  method: string;
  coffee?: string;
  water?: string;
  brewTime?: string;
  waterTemp?: string;
  coffeeName?: string;
  grinderNotes?: string;
  tastingNotes: string;
  freeNotes?: string;
  adjustmentHistory?: string[];
  ref?: string;
}

export interface DialInSuccess {
  advice: string;
  adjustment: string;
  usesRemaining: number;
  isPro: boolean;
}

export interface DialInLimit {
  error: 'limit_reached';
  resetsOn: string;
  requiresEmail?: boolean;
}

export type DialInResponse = DialInSuccess | DialInLimit;

export interface UserData {
  isPro: boolean;
  usesThisMonth: number;
  monthlyLimit: number;
  referralCode: string;
  lastBrew?: object;
}

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export function dialIn(params: DialInParams): Promise<DialInResponse> {
  return post<DialInResponse>('/dialin', params);
}

export function getUser(email: string): Promise<UserData> {
  return post<UserData>('/user', { email });
}

export function createCheckout(email: string, plan: 'monthly' | 'yearly'): Promise<{ url: string }> {
  return post<{ url: string }>('/create-checkout', { email, plan });
}

export function getCustomerPortal(email: string): Promise<{ url: string }> {
  return post<{ url: string }>('/customer-portal', { email });
}

export function saveBrew(email: string, brew: object): Promise<object> {
  return post<object>('/save-brew', { email, brew });
}

export function getReferralCode(email: string): Promise<{ code: string }> {
  return post<{ code: string }>('/referral-code', { email });
}

export interface PaymentIntentResult {
  clientSecret: string;
  subscriptionId?: string;
  customerId?: string;
}

export function createPaymentIntent(email: string, plan: 'monthly' | 'yearly'): Promise<PaymentIntentResult> {
  return post<PaymentIntentResult>('/create-payment-intent', { email, plan });
}
