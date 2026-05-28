import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body ?? {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const cleanEmail = email.toLowerCase().trim();

  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('referral_code')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (fetchError) {
    console.error('Supabase fetch error:', fetchError);
    return res.status(500).json({ error: 'Database error' });
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  let code = user.referral_code;

  // Generate a code if the user doesn't have one yet
  if (!code) {
    let attempts = 0;
    while (!code && attempts < 5) {
      const candidate = crypto.randomBytes(4).toString('hex'); // 8-char hex, URL-safe
      const { error: updateError } = await supabase
        .from('users')
        .update({ referral_code: candidate })
        .eq('email', cleanEmail);
      if (!updateError) code = candidate;
      attempts++;
    }
    if (!code) {
      return res.status(500).json({ error: 'Could not generate referral code' });
    }
  }

  return res.status(200).json({
    referralCode: code,
    referralUrl: `https://www.coffeebrew.coach?ref=${code}`,
  });
}
