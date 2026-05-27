import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

  const { email, method, coffee, water, brewTime, waterTemp, coffeeName,
          grinderNotes, tastingNotes, freeNotes, advice, ref } = req.body ?? {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (!advice) {
    return res.status(400).json({ error: 'Advice is required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const today = new Date().toISOString().split('T')[0];

  // Fetch or create user
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

  // Increment usage count
  const { error: updateError } = await supabase
    .from('users')
    .update({ uses_this_month: user.uses_this_month + 1 })
    .eq('email', cleanEmail);

  if (updateError) {
    console.error('Usage increment failed:', updateError);
  }

  // Add new users to Klaviyo
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
              list: { data: { type: 'list', id: 'UySSKn' } },
            },
          },
        }),
      });
      if (!klaviyoRes.ok) {
        const errBody = await klaviyoRes.text();
        console.error('Klaviyo error:', klaviyoRes.status, errBody);
      } else {
        console.log('Klaviyo subscribe success for:', cleanEmail);
      }
    } catch (err) {
      console.error('Klaviyo subscribe failed:', err);
    }
  }

  // Save brew to history
  const { error: brewError } = await supabase
    .from('brews')
    .insert({
      user_email:    cleanEmail,
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
    console.error('Brew history save failed:', brewError);
  }

  return res.status(200).json({
    usesRemaining: user.is_pro ? null : 10 - (user.uses_this_month + 1),
    isPro: user.is_pro ?? false,
  });
}
