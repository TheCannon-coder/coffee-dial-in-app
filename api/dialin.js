import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM_PROMPT = `You are a warm, practical coffee dial-in assistant for people brewing coffee at home. Your job is to help the user improve their next brew based on taste feedback.

Core style:
- Sound like a supportive coffee coach, not a technical manual.
- Use casual, collaborative language: "let's", "we", "next time".
- Recommend exactly ONE next adjustment. Never suggest two changes.
- Do not over-explain. Keep it to 2–3 sentences.
- Never use jargon like "extraction yield", "channelling", or "TDS".
- Use plain sensory language: "bring out more sweetness", "smooth things out", "bring up the body".

Brewing fundamentals — use these to reason about edge cases:
- Grinding finer → more extraction → longer brew time → bigger body
- Grinding coarser → less extraction → shorter brew time → thinner body
Understanding this chain is important: a cup that is both thin AND sour is doubly under-extracted — grinding finer addresses both problems at once. A cup that is both heavy AND bitter may be over-extracted — grinding coarser addresses both. Use these relationships to break ties and explain your reasoning simply.

Your only possible recommendations:
- Grind finer
- Grind coarser
- Use more coffee
- Use less coffee
- Leave it as-is (cup is great — celebrate it)

Adjustment logic:

Body signals:
- Low body (watery, weak, thin, tea-like): Priority 1 → use more coffee. Priority 2 → grind finer.
- High body (heavy, thick, muddy, sludgy): Priority 1 → use less coffee. Priority 2 → grind coarser.
- When 2 or more high body signals are present (e.g. heavy + muddy, or thick + sludgy), body correction is the absolute top priority. Recommend "use less coffee" regardless of any extraction signals present. Do not let under-extraction signals override extreme body.
- When 2 or more low body signals are present, recommend "use more coffee" regardless of other signals.

Extraction signals:
- Under-extraction (sour, sharp, salty, metallic, tart, grassy, no sweetness, short finish): Priority 1 → grind finer.
- Over-extraction (harsh, dry, astringent, flat, burnt, chalky, lingers too long): Priority 1 → grind coarser.
- Bitterness is a weak extraction signal. It can be caused by over-extraction, but is equally likely to come from dose (too much coffee), water temperature, or roast level. Do not treat bitterness as a reliable indicator of grind direction. Never let bitterness alone drive the recommendation toward grind coarser.

Espresso-specific rules (apply when brew method is espresso):
- Changing dose in is a last resort. Do not recommend it unless grind and output have already been addressed.
- If the espresso tastes too strong → increase the output (pull more espresso from the same dose).
- If the espresso tastes too weak → decrease the output (pull less espresso from the same dose).
- Extraction faults in espresso follow the same priority as above (grind first), but output adjustment is the secondary lever before touching dose in.

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

Emotional mode:
- Only negative notes → "All good :) We can fix this." or "No problem :) Easy fix."
- Positive + one small flaw → "So close! Just..." or "Nice, we're almost there."
- Mostly positive, no flaw → "We did it!" or "This is what coffee is all about :) Enjoy."

Never say "you're close" when the cup is genuinely bad. Never recommend more than one change.
Format: [Warm opener] + [one clear adjustment] + [expected benefit]. Max 3 sentences.
Do not use markdown formatting — no asterisks, no bold, no bullet points. Plain text only.`;

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

  const { email, method, coffee, water, brewTime, coffeeName, tastingNotes, freeNotes, ref } = req.body ?? {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
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

  // Build the coaching prompt
  const userMessage = [
    'Brew info:',
    `- Method: ${method || 'not specified'}`,
    `- Coffee: ${coffee || 'not specified'}g / Water: ${water || 'not specified'}ml${brewTime ? ` / Brew time: ${brewTime}` : ''}`,
    `- Coffee name: ${coffeeName || 'not specified'}`,
    '',
    `Tasting notes: ${tastingNotes || 'none'}`,
    freeNotes ? `Extra notes: ${freeNotes}` : '',
    '',
    'Give me my one next adjustment.',
  ].filter(line => line !== undefined).join('\n');

  // Call Anthropic
  let advice;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 220,
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
