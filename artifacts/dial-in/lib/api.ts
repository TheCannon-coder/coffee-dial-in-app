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
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server error (${response.status})`);
  }
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


export interface AffiliateStats {
  isAffiliate: boolean;
  tier?: string;
  referralCode?: string | null;
  monthlyRateCents?: number;
  totalConversions?: number;
  activeConversions?: number;
  totalPaidCents?: number;
  pendingCents?: number;
  estimatedMonthlyEarningsCents?: number;
}

export interface AffiliateMonth {
  month: string;
  newConversions: number;
  earningsCents: number;
}

export interface AffiliateMetrics {
  isAffiliate: boolean;
  months: AffiliateMonth[];
}

export function getAffiliateStats(email: string): Promise<AffiliateStats> {
  return post<AffiliateStats>('/affiliate/me', { email });
}

export function getAffiliateMetrics(email: string): Promise<AffiliateMetrics> {
  return post<AffiliateMetrics>('/affiliate/me/metrics', { email });
}

export interface ConnectOnboardingResult {
  url?: string;
  accountId?: string;
  alreadyComplete?: boolean;
  error?: string;
}

export interface ConnectStatusResult {
  status: 'not_started' | 'pending' | 'complete';
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
  error?: string;
}

export function startConnectOnboarding(email: string): Promise<ConnectOnboardingResult> {
  return post<ConnectOnboardingResult>('/affiliate/connect/onboard', { email });
}

export function getConnectStatus(email: string): Promise<ConnectStatusResult> {
  const url = `${API_BASE}/affiliate/connect/status?email=${encodeURIComponent(email)}`;
  return fetch(url).then((r) => r.json()) as Promise<ConnectStatusResult>;
}

export function submitFeedback(sessionId: string, wasHelpful: boolean): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/feedback', { sessionId, wasHelpful });
}

export interface PromoRedeemResult {
  message?: string;
  error?: string;
}

export function redeemPromoCode(
  code: string,
  revenuecatId: string,
  opts?: { email?: string; anonId?: string },
): Promise<PromoRedeemResult> {
  return post<PromoRedeemResult>('/promo/redeem', { code, revenuecatId, ...opts });
}

export interface ReferralClaimResult {
  success: boolean;
  rcGranted?: boolean;
  message?: string;
  error?: string;
}

export function claimReferralCode(
  referralCode: string,
  userId: number,
  revenuecatId: string,
): Promise<ReferralClaimResult> {
  return post<ReferralClaimResult>('/referral/claim', { referralCode, userId, revenuecatId });
}

export interface AffiliateJoinResult {
  success?: boolean;
  affiliate?: { id: number; tier: string; country: string };
  error?: string;
  comingSoon?: boolean;
}

export function joinAffiliate(params: {
  email: string;
  country: string;
  payoutEmail: string;
  audienceSize?: number;
  name?: string;
  ftcDisclosureAccepted: boolean;
}): Promise<AffiliateJoinResult> {
  return post<AffiliateJoinResult>('/affiliate/join', params);
}

export interface FriendReferralStats {
  qualifyingCount: number;
  pendingCount: number;
  proPermanent: boolean;
  totalReferrals: number;
}

export function getFriendReferralStats(email: string): Promise<FriendReferralStats> {
  const url = `${API_BASE}/referral/friend-stats?email=${encodeURIComponent(email)}`;
  return fetch(url).then((r) => r.json()) as Promise<FriendReferralStats>;
}

export interface RedeemReferralResult {
  success?: boolean;
  rcGranted?: boolean;
  message?: string;
  error?: string;
}

export function redeemReferralCode(email: string, code: string): Promise<RedeemReferralResult> {
  return post<RedeemReferralResult>('/referral/redeem', { email, code });
}

export interface UpdateReferralCodeResult {
  success?: boolean;
  code?: string;
  error?: string;
}

export function updateReferralCode(email: string, newCode: string): Promise<UpdateReferralCodeResult> {
  return post<UpdateReferralCodeResult>('/referral/update-code', { email, newCode });
}

