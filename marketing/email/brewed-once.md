# Brewed-once follow-up — draft for Chris's approval

Status: **DRAFT — built and shipped dark. Not sending until Chris approves the copy
and `LIFECYCLE_BREWED_ONCE=true` is set on Railway.** New template type, so it
gets the "first of its type" review.

Requested by Chris 2026-11-20, with a feedback section: "maybe there are
unaddressed issues with the app that are holding people back from using it
regularly."

## Who gets it, and when

- Logged **exactly one brew**, at least **5 days ago**, has an email, hasn't
  opted out, hasn't already received this template.
- Skips anyone who got *any* lifecycle email in the last 7 days, so templates
  never stack up.
- One send per person, ever. Founder accounts excluded.
- 19 eligible on 2026-11-20 (the scorecard's 27 one-brew people include some
  with no email or a brew from this week).

## What we're measuring

- **Second brew within 7 days** of the send, read from `lifecycle_sends`
  (`brewed_within_7d`). Expectation from the 2026-11-02 scorecard: 3+ of ~19
  is a signal; 2 is noise. Unsubscribes above 2–3% mean email isn't the lever.
- **Feedback answers**, read from `email_feedback` as counts per reason. This
  is the second goal: find out what's holding people back. Comment text goes
  to Chris's inbox and is never committed to the repo.

---

## Subject

**Your next tweak is still waiting**

Alternates: "How did the next cup go?" · "One change for your next cup"

## Body (personalized from their one brew)

Hey :)

Back on {September 23} you brewed {La Colmena} and told Coffee Brew Coach how
it tasted. It gave you one thing to try next time: {grind a touch finer}.

*(only if the brew was 30+ days ago:)* If that bag's long gone, no worries.
The same idea works on whatever you're brewing now.

Your next cup is a good chance to try it. Make that one change, then tap how it
tasted. That's how dialing in works: one tweak at a time, tasting as you go.

**[Log my next brew →]**

> **Quick question, if you've got ten seconds:**
> What's kept you from brewing with the app more? One tap is plenty. I read
> every answer myself.
>
> - I keep forgetting to open it
> - Logging a brew takes too long
> - The advice didn't help my coffee
> - Something in the app isn't working
> - My coffee's already where I want it
> - Something else

Thanks for giving it a go.

— Chris
Coffee Brew Coach

### If their one cup was already dialed in (adjustment "none")

The first and third paragraphs become:

> Back on {date} you brewed {coffee} and told Coffee Brew Coach how it tasted.
> It sounded like a great cup, so the advice was to keep everything the same.

> Beans keep changing as a bag ages, so your next cup is a good time to check
> in. Brew it the same way and tap how it tasted.

### Footer

Same as every lifecycle email: why you're getting it, one-tap unsubscribe,
postal address (`EMAIL_POSTAL_ADDRESS`), hello@coffeebrew.coach.

---

## The feedback page (coffeebrew.coach/feedback)

- Tapping a reason **records it immediately**, so a single tap counts even if
  they close the page.
- The page thanks them, shows what they picked, and asks a follow-up specific
  to that reason (e.g. "broken" → "What happened? What you tapped and what you
  saw"; "forget" → points to Settings → Brew reminders, then asks what would
  work).
- An optional comment box sends to Chris's inbox, with the person's email as
  reply-to, so hitting reply answers them directly. Chris's address is never
  shown to users.
- Links are HMAC-signed per user, so nobody can submit feedback as someone
  else. Throttled to 5 comments per person per hour.

## Why it reads the way it does

- Names their actual coffee and the actual tweak: proof the app remembers,
  and it gives them a concrete reason to brew again.
- Dates the brew honestly, and admits the bag may be gone, rather than
  pretending it was yesterday.
- No promised outcome, no urgency, no discount (per the brief).
- The feedback ask is framed as a favour, with one tap as the whole job.

## Mechanics

- Code: `renderBrewedOnce` / `selectBrewedOnce` in
  `artifacts/api-server/src/lib/lifecycle.ts`; feedback routes in
  `artifacts/api-server/src/routes/email.ts`; table `email_feedback`.
- Review: `GET /api/admin/lifecycle/preview?template=brewed_once` (add
  `&format=html` to see it; `&adjustment=none` and `&days=10` show the
  variants). `POST /api/admin/lifecycle/send-test?template=brewed_once&to=…`.
  Both need `x-admin-key`. Test emails' feedback links work in review mode:
  they render the page and relay a `[TEST]` comment but store nothing.

## To go live (in order)

1. Chris approves the copy above (edits welcome).
2. Test email to Chris's inbox; he reads it on his phone and taps a reason.
3. Set `LIFECYCLE_BREWED_ONCE=true` on Railway. The next hourly tick inside the
   13:00–22:00 UTC window sends to the eligible ~19 (capped at 25 per tick).
4. Read the scorecard 7 days later.
