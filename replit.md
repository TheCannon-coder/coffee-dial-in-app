# Dial In — Coffee Coach

An AI-powered coffee coaching iOS app that guides users to dial in their espresso extraction through guided tasting and personalized recommendations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (ESM, `"type": "module"`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo SDK 54 (React Native)

## Where things live

- `artifacts/dial-in/` — Expo iOS app
- `artifacts/api-server/` — Express API, port 8080, proxied at `/api`
- `artifacts/mockup-sandbox/` — Vite component preview server for canvas mockups
- `lib/db/` — Drizzle schema + migrations (source of truth for DB shape)
- `lib/api-spec/` — OpenAPI spec (source of truth for API contract)
- `artifacts/dial-in/lib/achievements.ts` — all 23 badge definitions
- `artifacts/dial-in/app/(tabs)/tasting.tsx` — main tasting + coaching flow

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed hooks + Zod schemas. Never hand-write API types.
- Feature flags via env vars: gear affiliate routes gated behind `AMAZON_AFFILIATE_TAG` presence; referral program routes gated behind `REFERRAL_PROGRAM=true`. Nothing ships until the flag is set.
- AI coaching (dialin.ts): "Flat" espresso is intentionally ambiguous — resolved by cross-referencing note clusters, not treated as a single signal.
- Colors via `useColors()`: espresso `#2C1A0E`, cream `#FAF7F2`. Fonts: `Fraunces_500Medium` (display), `DMSans_400Regular/500Medium` (body).

### Affiliate payout architecture — Stripe owns money & tax; we own business logic

**Stripe Connect handles (do not duplicate):**
- W-9 / W-8BEN collection during affiliate onboarding
- Bank account / identity verification
- 1099-NEC generation and IRS filing (via Stripe's 1099 add-on)

**We handle (Stripe cannot):**
- FTC disclosure checkbox + timestamp — legal requirement, our responsibility
- GDPR consent for EU/UK affiliates — our responsibility
- Promo code generation + self-referral blocking
- Conversion tracking (code → sale)
- Commission tier logic (Standard/Silver/Gold/Platinum)
- 30-day payout hold per conversion (refund fraud protection)
- AU withholding at 47% for affiliates without ABN — ATO obligation stays with us even for Connect users
- CA T4A slip generation (CRA obligation, not covered by Stripe)
- EU DAC7 reporting (Stripe does not generate DAC7 reports)
- $600 YTD flag — we track *why* the threshold was crossed

**Tax compliance gate on payouts:** satisfied by EITHER `connectOnboardingComplete` (Stripe collected the forms) OR `taxFormComplete` (manual W-9/W-8BEN via our API for Stage 1 PayPal affiliates). FTC disclosure and GDPR consent are always required regardless of payout method.

## Product

- Guided espresso tasting flow with AI-powered extraction diagnosis and adjustment recommendations
- Achievement system: 23 badges earned through tasting, sharing, and streaks; `BadgeEarnedModal` with spring/spark animation fires 900ms after tasting result
- Share cards: shareable tasting result cards
- (Feature-flagged, not live) Gear affiliate links via Amazon Associates (`AMAZON_AFFILIATE_TAG=coffeebrew056-20`)
- (Feature-flagged, not live) Referral program — see below

## Referral program (built, not yet deployed)

**Status:** Code complete, gated behind `REFERRAL_PROGRAM=true` env var. Enable to launch.

**Commission phase-down schedule** (controlled by `REFERRAL_COMMISSION` env var — no deploy needed to step down):
| Phase | Rate | Trigger |
|---|---|---|
| 1 — Launch | **$2.00/month** | Day 1 |
| 2 | $1.75/month | TBD |
| 3 | $1.50/month | TBD |
| 4 | $1.25/month | TBD |
| 5 — Mature | $1.00/month | TBD |

Higher launch rate attracts early advocates; steps down as the program becomes self-sustaining.

**Conversion funnel:**
- 25% of referred audience signs up, 18% of signups go Pro
- Pro subscription price: $4.99/month

**Unit economics at scale (20k Pro subscribers, 55% referral-driven):**
| | Monthly | Annual |
|---|---|---|
| Gross revenue | $99,800 | $1.20M |
| Stripe fees | −$8,900 | −$107k |
| Affiliate commissions (11k × $1) | −$11,000 | −$132k |
| API costs (20 brews/user × $0.018) | −$7,200 | −$86k |
| Hosting | −$400 | −$5k |
| **Gross profit** | **$72,300** | **$867k** |
| **Margin** | **~79%** | |

**CAC advantage:** Referral commission payback vs. paid acquisition is ~7–8 months, after which it's cheaper indefinitely. Commission only accrues while the user is retained.

**To launch the referral program:**
1. Set `REFERRAL_PROGRAM=true` in Replit Secrets
2. Build the backend: affiliate code generation, conversion tracking, payout ledger (DB schema not yet written)
3. Wire the referral code into the app's share flow
4. Connect a payout mechanism (Stripe Connect or manual CSV export initially)

**What's already built:**
- `artifacts/api-server/src/routes/earn.ts` — standalone HTML earnings calculator widget at `/api/earn`
- `artifacts/mockup-sandbox/src/components/mockups/referral/EarningsWidget.tsx` — React version for canvas/email embeds
- `artifacts/mockup-sandbox/src/components/mockups/referral/ReferralFinancialModel.tsx` — interactive financial model on canvas

## User preferences

- Feature-flag anything not ready for production — use env vars, never conditional compilation.
- Affiliate/gear feature is feature-flagged and NOT deployed per explicit user request.

## Gotchas

- Pre-existing TS errors in `lib/notifications.ts`, `lib/stripe-provider.native.tsx`, `lib/use-apple-pay.native.ts` — ignore, not from recent changes.
- Mockup sandbox: module map at `artifacts/mockup-sandbox/src/.generated/mockup-components.ts` must be manually updated when adding new mockup components.
- API server is ESM (`"type": "module"`) — dynamic `await import()` at module level is valid.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
