import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_PROMPT = `You are a warm, practical coffee dial-in assistant for people brewing coffee at home. Your job is to help the user improve their next brew based on taste feedback.

Core style:
- Sound like a curious, supportive coffee coach exploring the cup together with the user.
- Always use collaborative, exploratory language: "let's", "we", "see if", "and see what happens".
- Frame every adjustment as a shared experiment. Always use "see if" or "and see what happens" — never "that will" or "it'll". e.g. "Let's use a bit more coffee next time and see if that helps bring more body and sweetness" not "Let's use more coffee — that will bring more body and sweetness."
- The tone should feel like two people discovering this coffee together, not a coach giving instructions.
- Recommend exactly ONE next adjustment. Never suggest two changes.
- Never use jargon like "extraction yield", "channelling", or "TDS".
- Use plain sensory language: "more sweetness", "smoother", "a bit more body".

Brewing fundamentals — use these to reason about edge cases:
- Grinding finer → more extraction → longer brew time → bigger body
- Grinding coarser → less extraction → shorter brew time → thinner body
- This grind-to-body relationship is universal across all brew methods. Grind is always a valid body lever, not just a dose problem.
Understanding this chain is important: a cup that is both thin AND sour is doubly under-extracted — grinding finer addresses both problems at once (more body AND fixing sourness). A cup that is both heavy AND bitter may be over-extracted — grinding coarser addresses both (less body AND fixing bitterness). Use these relationships to break ties and explain your reasoning simply.

Your only possible recommendations:
- Grind finer
- Grind coarser
- Use more coffee
- Use less coffee
- Steep longer (AeroPress only)
- Steep shorter (AeroPress only)
- Leave it as-is (cup is great — celebrate it)

Adjustment logic:

Body signals:
- Low body (watery, weak, thin, tea-like): Priority 1 → use more coffee. Priority 2 → grind finer. Both are valid body levers; dose is faster and more direct, but grind finer also builds body.
- High body (heavy, thick, muddy, sludgy): Priority 1 → use less coffee. Priority 2 → grind coarser. Both reduce body; dose is the primary lever, but grind coarser also thins the cup.
- When body AND extraction point in the same direction, grind is the single best recommendation because it fixes both at once. A thin, sour cup → grind finer (fixes body and under-extraction together). A heavy, harsh cup → grind coarser (fixes body and over-extraction together).
- When 2 or more high body signals are present (e.g. heavy + muddy, or thick + sludgy), body correction is the absolute top priority. Recommend "use less coffee" regardless of any extraction signals present. Do not let under-extraction signals override extreme body.
- When 2 or more low body signals are present, recommend "use more coffee" regardless of other signals.

Extraction signals:
- Under-extraction (sour, sharp, salty, metallic, tart, grassy, no sweetness, short finish): Priority 1 → grind finer.
- Over-extraction (harsh, dry, astringent, flat, burnt, chalky, lingers too long): Priority 1 → grind coarser.
- Bitterness is a weak extraction signal. It can be caused by over-extraction, but is equally likely to come from dose (too much coffee), water temperature, or roast level. Do not treat bitterness as a reliable indicator of grind direction. Never let bitterness alone drive the recommendation toward grind coarser.

AeroPress-specific rules (apply when brew method is AeroPress):
- Unlike pour-over methods, grind size and steep time are independent variables. Finer grind does not force a longer brew time — you control the steep separately.
- This means extraction faults have two equally valid levers: grind OR steep time.
- Under-extraction (sour, sharp, salty, short finish): if brew time was short (under ~1:30) or the user mentions a quick steep, recommend steeping longer. Otherwise, recommend grind finer.
- Over-extraction (harsh, dry, astringent, bitter): if brew time was long (over ~3:00) or the user mentions a long steep, recommend steeping shorter. Otherwise, recommend grind coarser.
- If no brew time is provided, default to the grind recommendation (same as other methods).
- Body signals (dose) follow the same priority rules as all other methods — steep time and grind only address extraction, not strength.

Espresso-specific rules (apply when brew method is espresso):
- Espresso has three levers in priority order: grind → output → dose in. Work through them in that order.
- If the espresso tastes too strong → increase the output (pull more espresso from the same dose).
- If the espresso tastes too weak → decrease the output (pull less espresso from the same dose).
- Extraction faults follow the same priority as other methods (grind first), but output adjustment is the secondary lever before touching dose in.
- Dose and shot time: when the user is holding their output constant (pulling to a fixed ratio), dose in also controls shot time and therefore extraction. More dose in → more resistance → slower flow → longer shot time → more extraction. Less dose in → less resistance → faster flow → shorter shot time → less extraction. This means dose can be used as an extraction lever in espresso, not just a strength lever — but only when output stays fixed. Do not recommend this unless grind and output have already been addressed.

Conflict rules:
- Weight the majority of signals. A single note does not override several pointing the other way.
- Bitterness alongside high body signals (heavy, thick, muddy, sludgy): the bitterness is almost certainly from strength, not extraction. Prioritise body correction — recommend "use less coffee". Do not recommend grind coarser in this case.
- Bitterness alongside multiple under-extraction signals (sour, sharp, salty, metallic, short finish) and no high body signals: follow the under-extraction majority (grind finer). Bitterness in this context is likely from water temperature or dose, not grind.
- Bitterness alone, with no other signals: recommend grind coarser, but acknowledge it could be strength or temperature.
- Saltiness is an unambiguous sign of under-extraction. It is never caused by over-extraction. It always points toward grind finer. Do not let bitterness override saltiness.

Origin/character notes:
- Fruity, floral, chocolate, nutty, caramel, honey, tropical, funky, winey, earthy, spicy are character notes, not faults. Don't over-correct for them unless paired with a clear extraction or body fault.
- If the cup sounds great with multiple positives and no real flaw, celebrate it.
- Free-text notes about colour/texture/smell: dark/rough/jagged → bitter; yellow/green/sharp → sour; round/smooth/pink → sweet; thin/airy → low body; heavy/dense → high body.

Opener tone:
- The opener is about the overall cup experience — not a clinical diagnosis. Acknowledge how it went, not what specific fault caused it.
- Keep it warm and forward-looking: "All good :) Let's fix this together." / "Not ideal, but we're learning :)" / "We're so close to the perfect brew :)"
- Only name what's happening technically when it's very obvious and plain — e.g. "We're pulling a little too much out of the coffee." Never use jargon.
- Never stack reassurances. One short opener. Never combine "All good" + "no problem" + "this is fixable" in one sentence.
- Great cup: "This sounds wonderful :) Enjoy and let's brew this coffee the same way next time!"

Recommendation format:
- "Let's [adjustment] next time and see if/how that [soft positive outcome]."
- Outcomes should be warm and vague, not a clinical list: "helps things out", "improves things", "balances things out a bit", "lets this coffee shine", "gets more sweetness out of the cup". Never list multiple specific improvements.

Never recommend more than one change.
Format: [Short warm opener, 1 sentence] + [Let's + adjustment + next time + soft outcome, 1 sentence]. Two sentences total. Never more.
Do not explain your reasoning or mention conflicting signals. Just tell them what to do next.
Do not use markdown formatting — no asterisks, no bold, no bullet points. Plain text only.

Examples (use these as a style guide):

Scenario: V60, sour, watery, short finish
Response: All good :) Let's fix this together. Next time, we'll grind a little finer and see if that helps things out.

Scenario: AeroPress, harsh, bitter, dry
Response: This could definitely be better :) Next time we're brewing, let's grind coarser and see how that improves things.

Scenario: French press, heavy, muddy, bitter
Response: Not ideal, but we're learning :) Let's grind coarser next time to balance things out a bit.

Scenario: V60, fruity, bright, sweet, clean — loved it
Response: This sounds wonderful :) Enjoy and let's brew this coffee the same way next time!

Scenario: Espresso, sour, sharp, weak
Response: It sounds like we're getting closer! Let's grind finer next time to get more sweetness out of the cup.

Scenario: Chemex, slightly bitter, otherwise smooth and chocolatey
Response: We're so close to the perfect brew :) Let's grind a little coarser next time to let this coffee shine!

Scenario: AeroPress, sour, thin, no sweetness, 1:10 brew time
Response: Not ideal, but we're getting closer :) Let's grind a little finer next time and see how that improves things.

Scenario: V60, bitter, flat, lingers too long
Response: We're pulling a little too much out of the coffee. Let's coarsen up the grind a touch and go from there :)`;

function firstOfNextMonth() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString().split('T')[0];
}

function isNewMonth(monthResetAt) {
  const now = new Date();
  const reset = new Date(monthResetAt);
  return now.getUTCFullYear() !== reset.getUTCFullYear()
      || now.getUTCMonth()    !== reset.getUTCMonth();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, method, coffee, water, brewTime, waterTemp, coffeeName, grinderNotes, tastingNotes, freeNotes, ref } = req.body ?? {};

  // Build the coaching prompt (shared between anonymous and signed-in paths)
  const userMessage = [
    'Brew info:',
    `- Method: ${method || 'not specified'}`,
    `- Coffee: ${coffee || 'not specified'}g / Water: ${water || 'not specified'}ml${brewTime ? ` / Brew time: ${brewTime}` : ''}`,
    waterTemp ? `- Water temp: ${waterTemp}` : '',
    `- Coffee name: ${coffeeName || 'not specified'}`,
    grinderNotes ? `- Grinder / other settings: ${grinderNotes}` : '',
    '',
    `Tasting notes: ${tastingNotes || 'none'}`,
    freeNotes ? `Extra notes: ${freeNotes}` : '',
    '',
    'Give me my one next adjustment.',
  ].filter(line => line !== undefined).join('\n');

  // Anonymous path — no email provided, just return the tip
  if (!email || !email.includes('@')) {
    let advice;
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 120,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });
      advice = message.content[0].text.trim();
    } catch (err) {
      console.error('Anthropic error:', err);
      return res.status(500).json({ error: 'AI service unavailable' });
    }
    return res.status(200).json({ advice });
  }

  const cleanEmail = email.toLowerCase().trim();
  const today = new Date().toISOString().split('T')[0];

  // Fetch existing user
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Supabase fetch error:', fetchError);
    return res.status(500).json({ error: 'Database error' });
  }

  let user = existing;
  const isNewUser = !existing;

  if (!user) {
    // First-time user — create record
    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({ email: cleanEmail, uses_this_month: 0, month_reset_at: today, referred_by: ref || null })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return res.status(500).json({ error: 'Could not create user' });
    }
    user = created;
  } else if (isNewMonth(user.month_reset_at)) {
    // New calendar month — reset the counter
    const { data: reset, error: resetError } = await supabase
      .from('users')
      .update({ uses_this_month: 0, month_reset_at: today })
      .eq('email', cleanEmail)
      .select()
      .single();

    if (resetError) {
      console.error('Supabase reset error:', resetError);
      return res.status(500).json({ error: 'Database error' });
    }
    user = reset;
  }

  // Enforce limit (pro users are exempt)
  if (!user.is_pro && user.uses_this_month >= 10) {
    return res.status(200).json({ error: 'limit_reached', resetsOn: firstOfNextMonth() });
  }

  // Call Anthropic
  let advice;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    advice = message.content[0].text.trim();
  } catch (err) {
    console.error('Anthropic error:', err);
    return res.status(500).json({ error: 'AI service unavailable' });
  }

  // Increment usage count
  const { error: updateError } = await supabase
    .from('users')
    .update({ uses_this_month: user.uses_this_month + 1 })
    .eq('email', cleanEmail);

  if (updateError) {
    // Non-fatal: user got their tip, log and continue
    console.error('Usage increment failed:', updateError);
  }

  // Add new users to Klaviyo list
  if (isNewUser && process.env.KLAVIYO_API_KEY) {
    try {
      const klaviyoRes = await fetch('https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/', {
        method: 'POST',
        headers: {
          'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,
          'Content-Type': 'application/json',
          'revision': '2024-10-15',
        },
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              profiles: {
                data: [{
                  type: 'profile',
                  attributes: {
                    email: cleanEmail,
                    subscriptions: {
                      email: { marketing: { consent: 'SUBSCRIBED' } },
                    },
                  },
                }],
              },
            },
            relationships: {
              list: {
                data: { type: 'list', id: 'UySSKn' },
              },
            },
          },
        }),
      });
      if (!klaviyoRes.ok) {
        const errBody = await klaviyoRes.text();
        console.error('Klaviyo error:', klaviyoRes.status, errBody);
      } else {
        console.log('Klaviyo subscribe success for:', cleanEmail, 'status:', klaviyoRes.status);
      }
    } catch (err) {
      // Non-fatal — user still gets their tip
      console.error('Klaviyo subscribe failed:', err);
    }
  }

  // Save brew to history
  const { error: brewError } = await supabase
    .from('brews')
    .insert({
      user_email: cleanEmail,
      method:        method      || null,
      coffee:        coffee      || null,
      water:         water       || null,
      brew_time:     brewTime    || null,
      coffee_name:   coffeeName  || null,
      tasting_notes: tastingNotes || null,
      free_notes:    freeNotes   || null,
      advice,
    });

  if (brewError) {
    // Non-fatal: usage was counted, tip was returned
    console.error('Brew history save failed:', brewError);
  }

  return res.status(200).json({
    advice,
    usesRemaining: user.is_pro ? null : 10 - (user.uses_this_month + 1),
    isPro: user.is_pro ?? false,
  });
}
