import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { order_id, donorName, amount } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = process.env.CASHFREE_ENV || 'sandbox';

    const baseUrl = env === 'production'
      ? `https://api.cashfree.com/pg/orders/${order_id}`
      : `https://sandbox.cashfree.com/pg/orders/${order_id}`;

    const cfResponse = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
      },
    });

    const data = await cfResponse.json();

    if (!cfResponse.ok) {
      return res.status(cfResponse.status).json({ error: data.message || 'Failed to verify order.' });
    }

    // Check payment status
    if (data.order_status === 'PAID') {
      const paidAmount = Number(data.order_amount || amount);
      const nameToSave = (donorName && donorName.trim()) || data.customer_details?.customer_name || 'Supporter';

      // Insert verified donor into Supabase
      const { error: dbError } = await supabase.from('donations').insert({
        donor_name: nameToSave,
        amount: paidAmount,
        display_publicly: true,
      });

      if (dbError) {
        console.error('Failed to insert donation:', dbError);
      }

      return res.status(200).json({ success: true, status: 'PAID' });
    } else {
      return res.status(400).json({
        success: false,
        status: data.order_status,
        error: `Payment is not completed. Current status: ${data.order_status}`,
      });
    }
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(500).json({ error: err.message || 'Verification failed.' });
  }
}
