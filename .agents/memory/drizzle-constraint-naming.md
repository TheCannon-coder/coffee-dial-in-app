---
name: Drizzle constraint naming
description: PostgreSQL 63-char identifier limit causes silent truncation of drizzle-generated unique constraint names, breaking drizzle-kit push in non-TTY environments.
---

## The rule
Always give explicit short names (≤ 50 chars to be safe) to table-level `unique()` calls in drizzle schema. Never rely on drizzle's auto-generated name for multi-column unique constraints.

```ts
// BAD — drizzle generates "promo_code_redemptions_promo_code_id_revenuecat_customer_id_unique" (67 chars)
// PostgreSQL silently truncates to 63 chars → perpetual mismatch
(t) => [unique().on(t.promoCodeId, t.revenuecatCustomerId)]

// GOOD — explicit short name, same in drizzle schema and DB
(t) => [unique("pcr_unique_promo_customer").on(t.promoCodeId, t.revenuecatCustomerId)]
```

**Why:** drizzle-kit push compares schema constraint names to DB constraint names. If they differ (due to truncation), drizzle thinks the constraint is missing and tries to add it. In a non-TTY environment (post-merge script), this produces an interactive prompt that errors out instead of completing.

**How to apply:** Any time you add a `unique()` call at the table level (second argument to `pgTable`), provide an explicit name ≤ 50 chars. Single-column `.unique()` inline on the column definition is fine — drizzle names those `{table}_{column}_unique` which typically fits in 63 chars.

**Fix when already hit:** Rename the DB constraint to match what drizzle expects (or vice versa):
```sql
ALTER TABLE promo_code_redemptions
  RENAME CONSTRAINT promo_code_redemptions_promo_code_id_revenuecat_customer_id_uni
  TO pcr_unique_promo_customer;
```
Also update the drizzle schema to use the new explicit name so they stay in sync.

**Also:** inline `.unique()` on columns can create `_key` suffix constraints if the column was added via raw SQL ALTER TABLE (PostgreSQL's default). Drizzle expects `_unique`. Rename those too.
