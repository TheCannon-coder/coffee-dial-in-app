import { createClient } from '@supabase/supabase-js';

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

  const { data: brew, error } = await supabase
    .from('brews')
    .select('*')
    .eq('user_email', cleanEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase error fetching last brew:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  if (!brew) {
    return res.status(200).json({ lastBrew: null });
  }

  return res.status(200).json({
    lastBrew: {
      timestamp: new Date(brew.created_at).getTime(),
      method: brew.method,
      coffee: brew.coffee,
      water: brew.water,
      brewTime: brew.brew_time,
      coffeeName: brew.coffee_name,
      notes: brew.tasting_notes,
      advice: brew.advice,
    }
  });
}
