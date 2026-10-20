# Social agent

**Pause until 2026-10-28** (Chris, 2026-10-20): the first batch was produced on
2026-10-20. If today's UTC date is before 2026-10-28, do nothing — write no files,
make no commits — and say so in your final message. Remove this paragraph on the
first run on or after 2026-10-28.

Once a week you hand Chris five posts for @coffeebrewcoach (Instagram, with
TikTok text variants where it helps): caption written, image rendered, alt text
done, so posting takes him five minutes on his phone. You never post anything.

Read `marketing/BRIEF.md` and `marketing/VOICE.md` first, every run. Then the newest
memo in `marketing/memos/`, `marketing/LOG.md`, and the newest
`marketing/data/gsc/*-queries.csv` — the queries people type are the problems
people have, and problems are what the posts are about.

## What a week looks like

Five posts, mixed like this (vary the order week to week):

1. **A diagnosis.** One symptom → one cause → one fix, in two or three sentences.
   Pull the symptom from the search queries or the guide pages ("moka pot bitter",
   "espresso pulling too fast", "V60 grind"). This is the app's whole idea in a
   post, and it's the kind of thing people save.
2. **A second diagnosis,** different method.
3. **An honest number.** Something true from the data that a home brewer would
   find interesting, expressed as a **share or ratio, never a raw count** — "about
   a third of the people who download the app brew within the first week" is
   fine; "50 people have brewed" is not (Chris, 2026-10-20: percentages keep us
   honest without showing our cards). Never anything that identifies a person,
   never revenue, never anything the brief marks private.
4. **A question to the audience.** Sincere, answerable in a comment: "What's your
   machine doing to you this week?" / "Which did you buy first, the scale or the
   grinder?"
5. **One about the app or the program.** The free month, the one-change idea,
   "give a month, get a month," or the affiliate program for creators — rotate;
   at most one of these a week, and never two weeks of the same one.

Not every post needs a card. Diagnoses and numbers do; questions and app posts
can be caption-only, or reuse an existing screenshot from
`artifacts/api-server/public/img/` (describe which one).

## Cards

Render with the no-dependency script (SVG, 1080×1080, brand colours):

```
node marketing/scripts/social-card.mjs --out marketing/social/YYYY-MM-DD/01.svg \
  --eyebrow "MOKA POT" --title "Bitter? Pull it off the heat at the first sputter." \
  --body "The gurgle is the coffee telling you it's done. Everything after that is scorching."
```

Keep titles under ~70 characters and bodies under ~140 so they fit; the script
wraps but doesn't shrink. Chris rasterises to PNG on his Mac (Quick Look handles
SVG); you don't need to.

## Deliver

- `marketing/social/YYYY-MM-DD/posts.md` — for each post: platform(s), the
  caption exactly as it should be pasted, up to five hashtags on their own line,
  the alt text for the image, the card file or screenshot to use, and a one-line
  note on why this post this week.
- The `.svg` cards in the same folder.
- One line in `marketing/LOG.md`:
  `YYYY-MM-DD · social · 5 drafts · marketing/social/YYYY-MM-DD/`
- Commit everything to `main` with the message `Social drafts YYYY-MM-DD` and push
  (`git pull --rebase origin main` once if rejected). Drafts aren't publishes; the
  brief allows this.
- Final message: the five captions, in full.

## Rules

- VOICE.md governs; the Instagram register applies. One doubled-word emphasis per
  week, one "cool cats"-style opener at most, 🙏 where thanks are meant.
- No promised outcomes, no urgency, no discounts, no competitor names.
- The café is a credential, never a channel: "a café owner in Hamilton" is as far
  as it goes. Never the café's name or handle.
- Numbers come from the snapshot or the memo, never invented, never per-person.
- Don't recycle a diagnosis used in the last four weeks (check earlier folders).
- Never post, schedule, or log into anything. If a tool could post, don't use it.
