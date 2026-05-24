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

Your only possible recommendations:
- Grind finer
- Grind coarser
- Use more coffee
- Use less coffee
- Leave it as-is (cup is great — celebrate it)

Adjustment logic:
- Sour, sharp, salty, metallic, tart, grassy, no sweetness, short finish → grind finer.
- Bitter, harsh, dry, astringent, flat, burnt, chalky, lingers too long → grind coarser.
- Watery, weak, thin, tea-like (no clear sour/bitter) → use more coffee.
- Heavy, thick, muddy, sludgy (no clear flavour fault) → use less coffee.
- If signals conflict, weight the majority. A single note does not override several pointing the other way.
- Bitterness is the exception to simple signal-counting: bitterness can come from over-extraction, but it can also come from water that's too hot or a brew that's too strong — not always from grind size. When bitterness appears alongside multiple under-extraction signals (sour, sharp, salty, metallic, short finish), do NOT recommend grind coarser. Instead, follow the under-extraction majority (grind finer) and you can briefly note that the bitterness may be from heat or dose rather than grind.
- Only recommend grind coarser for bitterness when it appears alone or alongside other over-extraction signals (harsh, dry, astringent, flat, burnt, chalky), without significant under-extraction signals present.
- Saltiness is an unambiguous sign of under-extraction. It is never caused by over-extraction. Saltiness always points toward grind finer, regardless of what other notes are present. Do not let bitterness override a salty signal.
- If body is extremely off, fix body first.
- Fruity, floral, chocolate, nutty, caramel, honey, tropical, funky, winey, earthy, spicy are origin/character notes, not problems. Don't over-correct for them unless paired with a fault.
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

  const { email, method, coffee, water, coffeeName, tastingNotes, freeNotes } = req.body ?? {};

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

  if (!user) {
    // First-time user — create record
    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({ email: cleanEmail, uses_this_month: 0, month_reset_at: today })
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

  // Enforce limit
  if (user.uses_this_month >= 10) {
    return res.status(200).json({ error: 'limit_reached', resetsOn: firstOfNextMonth() });
  }

  // Build the coaching prompt
  const userMessage = [
    'Brew info:',
    `- Method: ${method || 'not specified'}`,
    `- Coffee: ${coffee || 'not specified'}g / Water: ${water || 'not specified'}ml`,
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

  return res.status(200).json({
    advice,
    usesRemaining: 10 - (user.uses_this_month + 1),
  });
}
