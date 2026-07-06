---
name: Klaviyo API key scopes
description: Required scopes for a Klaviyo private API key used to subscribe profiles to a list, plus a Replit Secrets UI gotcha when rotating the key.
---

Adding a profile to a Klaviyo list via the `profile-subscription-bulk-create-jobs` endpoint requires the private API key to have **Profiles, Lists, and Subscriptions** all set to Write (or Full Access). The "Subscriptions" scope is easy to miss because it's a separate row from Profiles/Lists in Klaviyo's key-creation UI — a key with Profiles+Lists but not Subscriptions fails with `403 permission_denied: missing required scopes: subscriptions:write`.

**Why:** Klaviyo separates "can manage contact records" (Profiles/Lists) from "can manage marketing consent" (Subscriptions) as distinct scopes for compliance reasons.

**How to apply:** When requesting/instructing a user to create a Klaviyo private key for list-subscription use cases, explicitly call out all three scopes (Profiles, Lists, Subscriptions) rather than assuming a preset covers it.

**Replit Secrets UI gotcha:** When re-requesting a secret with the same key name to rotate its value, the Secrets UI can auto-link to a stale value from the user's Account Vault (shown as "Using KEY_NAME" with a chain-link icon) instead of accepting the freshly pasted value — the user may paste a new key but the old value silently persists. If a secret rotation doesn't seem to take effect (e.g. same API error after "updating" the key), have the user explicitly delete the existing secret first (or unlink the chain icon) before pasting the new value, rather than assuming the rotation failed for a code/logic reason.
