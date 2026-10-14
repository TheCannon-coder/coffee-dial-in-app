# Never-brewed nudge — draft for Chris's approval

Status: **DRAFT — not approved, not sending.** First email the app has ever sent
to users, so this is the "first of its type" review the brief requires.

## Who gets it, and when

- Signed up **2 to 30 days ago**, has an email on the account, has **never logged
  a brew**, hasn't opted out, hasn't already received this.
- One send per person, ever. No reminders, no re-sends.
- The 82 people who signed up more than 30 days ago get the second variant below
  (different opener) — but only after we've seen how the first 6 respond.
- Founder accounts excluded.

## What we're measuring

Share of recipients who log a first brew within 7 days of the send, against the
recent never-brewed baseline (of the 20 who signed up since Aug 24, 14 brewed on
their own). Unsubscribes and bounces are reported too. With 6 recipients, 1–2
brews is a signal, not proof.

---

## Subject (pick one)

1. **Still got a cup you don't love?**
2. One brew, one thing to change
3. Your first brew's waiting

## Body — variant A (signed up 2–30 days ago)

Hey :)

You grabbed Coffee Brew Coach a little while ago and haven't logged a brew yet.
Totally fine — most people don't on day one.

Here's the whole thing: make your coffee the way you normally do, open the app,
and tap how it tasted. Bitter, sour, weak, whatever it was. It gives you one
thing to change next time. Not a recipe, not ten tips. One change.

That's it. It takes about a minute, and you'll know what to try on the next cup.

**[Open the app and log a brew →]**

If the app's gone from your phone, it's on the App Store, and your account's
still here.

Thanks for giving it a go.

— Chris
Coffee Brew Coach

## Body — variant B (signed up 30+ days ago)

Same as A, with the first paragraph replaced by:

> You grabbed Coffee Brew Coach a while back and never got around to a brew.
> No worries at all — I'm not here to nag, just to make it easy.

## Footer (required on every send)

> You're getting this because you made a Coffee Brew Coach account. Don't want
> these? [Unsubscribe] — one tap, no questions.
> Coffee Brew Coach · [mailing address — Chris to supply] · hello@coffeebrew.coach

The mailing address is a legal requirement (CASL in Canada, CAN-SPAM in the US).
Decision 2026-10-14: use the café's street address, written **without** the café's
name — the brief's rule (§4) is about the name, not the street. The footer must
never say "The Cannon".

---

## Why it reads the way it does

- Leads with the point and the ask; under 120 words before the button.
- No promised outcome ("you'll know what to try" is what the app does, not a result).
- No urgency, no scarcity, no discount.
- One ":)" — broadcast-email register, not Instagram.
- First person, one reader, signed "— Chris". Hamilton isn't mentioned; The Cannon
  isn't mentioned. Credential comes later, in content, not in a nudge.
- Gratitude at the close, no re-pitch.

## Mechanics (built 2026-10-14, shipped dark)

The canonical copy lives in `artifacts/api-server/src/lib/lifecycle.ts`
(`renderNeverBrewed`). This file is the human-readable spec; if they ever differ,
fix the code to match the approved copy here.

- `lifecycle_sends` table — one row per (user, template); the selector excludes
  anyone with a row, so nobody gets the same template twice. Failed sends are
  recorded too, so a bad address isn't retried hourly.
- `users.email_opt_out` + `GET/POST /email/unsubscribe?u=…&t=…` (HMAC-signed,
  one tap, RFC 8058 one-click header included). Honoured by every future template.
- Hourly tick in the API server (first run 5 min after boot), sends only between
  13:00 and 22:00 UTC so mail lands in the daytime. From
  `Coffee Brew Coach <hello@coffeebrew.coach>`, reply-to support@.
- Button → `https://www.coffeebrew.coach/open?to=brew`: opens the app if it's
  installed (deep link, and a universal link once iOS refreshes the site
  association), App Store if not.
- Railway flags: `LIFECYCLE_EMAILS=true` (master switch — currently unset, so
  nothing sends), `LIFECYCLE_NEVER_BREWED_OLDER=true` for variant B (unset),
  `LIFECYCLE_DRY_RUN=true` to log instead of send, `LIFECYCLE_MAX_PER_TICK`
  (default 25), and `EMAIL_POSTAL_ADDRESS` — the sender refuses to run without it.
- Review: `POST /api/admin/lifecycle/send-test?to=<your email>` sends the real
  rendering to your inbox with a `[TEST]` subject; `GET /api/admin/lifecycle/preview`
  shows eligible counts and flag state. Both need the `x-admin-key` header.
- The Scorecard reads `lifecycle_sends` on Monday: sends, brewed-within-7-days,
  unsubscribed-after — counts only, never names.

## To go live (in order)

1. Chris approves the copy above (edits welcome — say what to change).
2. Chris supplies a mailing address → `EMAIL_POSTAL_ADDRESS` on Railway.
3. Send a test to Chris's inbox; he reads it on his phone.
4. Set `LIFECYCLE_EMAILS=true` on Railway. The next tick (within the hour, in the
   send window) emails the ~6 recent never-brewed signups.
5. Read the Monday scorecard before enabling variant B for the other 82.
