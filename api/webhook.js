import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  // Payment succeeded — activate pro
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata?.email || session.customer_details?.email;
    if (email) {
      const { error } = await supabase
        .from('users')
        .update({
          is_pro: true,
          subscription_status: 'active',
          stripe_customer_id: session.customer,
        })
        .eq('email', email.toLowerCase().trim());
      if (error) console.error('Supabase activate pro error:', error);
      else console.log('Pro activated for:', email);
    }
  }

  // Subscription cancelled — deactivate pro
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { error } = await supabase
      .from('users')
      .update({ is_pro: false, subscription_status: 'cancelled' })
      .eq('stripe_customer_id', subscription.customer);
    if (error) console.error('Supabase cancel pro error:', error);
    else console.log('Pro cancelled for customer:', subscription.customer);
  }

  // Subscription updated (e.g. payment failed, resumed)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const isActive = subscription.status === 'active';
    const { error } = await supabase
      .from('users')
      .update({ is_pro: isActive, subscription_status: subscription.status })
      .eq('stripe_customer_id', subscription.customer);
    if (error) console.error('Supabase update pro error:', error);
    else console.log('Subscription updated for customer:', subscription.customer, subscription.status);
  }

  return res.status(200).json({ received: true });
}
