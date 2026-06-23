---
name: IAP Paid Apps Agreement
description: Why RevenueCat offerings fail to load in Apple sandbox during App Store review
---

## Rule
Before IAP can work in Apple's sandbox (and therefore pass App Store review), the **Paid Apps Agreement** must be accepted in App Store Connect → Agreements, Tax, and Banking.

**Why:** Without the Paid Apps Agreement, Apple's StoreKit refuses to return IAP products to any app — including during sandbox review. RevenueCat calls StoreKit under the hood; if StoreKit errors, `offeringsQuery` fails and the paywall shows "Could not load subscription options."

Apple's rejection message explicitly calls this out: *"To offer In-App Purchases in the app, the Account Holder must also accept the Paid Apps Agreement."*

**How to apply:** If IAP products fail to load in a production/TestFlight build and RevenueCat configuration looks correct, check Agreements, Tax, and Banking in App Store Connect before touching any code. The Free Apps agreement is not sufficient — Paid Apps is a separate contract requiring banking details and tax info.

**Note:** DSA "In Review" status does NOT block IAP or App Store review — it only affects EU distribution.
