import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-signature, x-webhook-timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};

    // Check if payment succeeded
    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK' || payload.data?.payment?.payment_status === 'SUCCESS') {
      const order = payload.data?.order || {};
      const customer = payload.data?.customer_details || {};
      const payment = payload.data?.payment || {};

      const donorName = customer.customer_name || 'Supporter';
      const amount = Number(order.order_amount || payment.payment_amount || 0);

      if (amount > 0) {
        // Insert into Supabase (Live Donor Wall updates automatically)
        const { error: dbError } = await supabase.from('donations').insert({
          donor_name: donorName,
          amount: amount,
          display_publicly: true,
        });

        if (dbError) {
          console.error('Database insertion error:', dbError);
        }
      }
    }

    return res.status(200).json({ status: 'OK' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
