const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : 'https://www.coffeebrew.coach/api';

export interface DialInParams {
  email?: string;
  anonId?: string;
  sessionId?: string;
  method: string;
  coffeeName?: string;
  dose?: string;
  water?: string;
  brewTime?: string;
  waterTemp?: string;
  grinderNotes?: string;
  tastingNotes: string;
  freeNotes?: string;
  adjustmentHistory?: string[];
  brewComparison?: 'better' | 'same' | 'worse';
  ref?: string;
}

export interface DialInSuccess {
  advice: string;
  adjustment: string;
  usesRemaining: number;
  isPro: boolean;
  sessionId: string;
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

export interface AppleSignInResult {
  email: string;
  isPro: boolean;
  usesThisMonth: number;
  monthlyLimit: number;
  referralCode: string;
}

export function signInWithApple(appleUserId: string, email?: string): Promise<AppleSignInResult> {
  return post<AppleSignInResult>('/user/apple', { appleUserId, email });
}

export interface PaymentIntentResult {
  clientSecret: string;
  subscriptionId?: string;
  customerId?: string;
}

const SUPABASE_FUNCTIONS_URL = 'https://bdfkpchjvsbsbkdyjflo.supabase.co/functions/v1';

export async function createPaymentIntent(email: string, plan: 'monthly' | 'yearly'): Promise<PaymentIntentResult> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, plan }),
  });
  return response.json() as Promise<PaymentIntentResult>;
}
