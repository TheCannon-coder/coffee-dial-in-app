---
name: RC entitlement grant via v2 SDK
description: How to correctly grant promotional entitlements in RevenueCat from the API server
---

## Rule
Use `REVENUECAT_SECRET_KEY` + `@replit/revenuecat-sdk` v2 SDK (`grantCustomerEntitlement`) to grant entitlements server-side. Do NOT use `connectors.proxy("revenuecat", ...)` for this — the Replit RC connector key lacks `customer_information:customers:read_write` scope and returns 403. Do NOT call the v1 API (`/v1/subscribers/.../entitlements/pro/promotional`) via the connector — it returns 401 because the connector formats the auth header for v2 only.

**Why:** The Replit RC connector is configured for the `@replit/revenuecat-sdk` v2 management SDK (listing offerings, products, etc.) with a read-only-ish key. Granting entitlements requires a separate secret key with write scopes stored in `REVENUECAT_SECRET_KEY`.

**How to apply:**
- `artifacts/api-server/src/lib/revenuecat.ts` — shared helper; uses `REVENUECAT_SECRET_KEY` directly with `createClient(createConfig({ baseUrl, headers: { Authorization } }))`
- `REVENUECAT_PRO_ENTITLEMENT_ID` env var holds the UUID (`entld348603bd5`) — NOT the string identifier "pro"
- `expires_at` in `grantCustomerEntitlement` is **milliseconds** since epoch
- `affiliate-helpers.ts::grantRcProEntitlement` delegates to the same helper — keep in sync
