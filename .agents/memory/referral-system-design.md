---
name: Referral system design
description: How the two-track referral/affiliate system works and key invariants to preserve
---

## Two tracks, one code

Both friend referrals and influencer affiliate commissions use the same `referralCode` field on `users`. The reward track is determined at **subscription time** (Stripe webhook `checkout.session.completed`):

- Referrer has a row in `affiliates` table with `is_active=true` → **affiliate track** (cash commissions, `is_affiliate_conversion=true`)
- Referrer has no affiliate row → **friend track** (`is_affiliate_conversion=false`, brew-count gating)

## Friend track gates
1. Referred user signs up with code → 1 month Pro via RC, `referral_conversions` row created
2. After 3 brew sessions (tracked via `brew_count` incremented in `dialin.ts`) → referrer gets 1 month Pro via RC
3. After 10 qualifying referrals (brew_count >= 3 each) → `pro_permanent=true, isPro=true` on referrer

## Affiliate track
- Monthly plans: `recurring` ledger entry at each renewal (checked by monthly payout job)
- Annual plans: 12 monthly `instalment` entries, `instalment_status=active`
- Lifetime plans: 6 monthly `instalment` entries, `instalment_status=active`
- Rate locked at first subscription — `customMonthlyRateCents` etc. written to `affiliates` row

## Key invariants

**proPermanent must never be reverted:**
- `checkAndGrantPermanentPro` sets both `isPro=true` AND `proPermanent=true`
- Stripe `subscription.deleted` webhook skips `isPro=false` if `user.proPermanent=true`

**Self-referral prevention:**
- `POST /referral/claim` checks `referrer.id !== user.id`
- `referredByCode` on user prevents claiming twice

**Geographic gate:**
- Affiliate payout program is US and CA only (v1)
- `/affiliate/join` enforces `allowedCountries = ['US', 'CA']`

## RC entitlement durations
Valid strings: monthly, two_month, three_month, six_month, yearly, lifetime
No 14-day option → use `monthly` (30 days) for referral trials; frame as "1 month free" in UX.

## Feature flag
All referral routes (`/referral/*`, `/affiliate/join`) are registered only when `REFERRAL_PROGRAM=true`.
