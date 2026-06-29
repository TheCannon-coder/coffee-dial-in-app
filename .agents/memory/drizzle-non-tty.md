---
name: Drizzle push in non-TTY
description: drizzle-kit push fails in non-interactive shells when existing data triggers confirmation prompts (e.g. unique constraint changes)
---

When `pnpm --filter @workspace/db run push` detects a potentially destructive change on a table with existing rows, drizzle-kit asks an interactive confirmation question. In a non-TTY shell this throws:
> "Interactive prompts require a TTY terminal"

**Fix:** Use direct SQL via `executeSql` in the code_execution sandbox:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_permanent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE referral_conversions ADD COLUMN IF NOT EXISTS brew_count INTEGER NOT NULL DEFAULT 0;
-- ... etc
```

**Why:** `ADD COLUMN IF NOT EXISTS` is safe and idempotent. No data is truncated. The interactive prompt only fires when drizzle thinks it needs to drop/recreate something, which ALTER TABLE avoids entirely.

**How to apply:** Any time a schema change adds new nullable or default-valued columns, skip `drizzle push` and use direct ALTER TABLE SQL instead.
