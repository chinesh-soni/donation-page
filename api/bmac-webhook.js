import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body || {};
    
    // Extract donor details from Buy Me a Coffee webhook payload
    // Handles various Buy Me a Coffee payload structures
    const data = payload.data || payload;
    const donorName = data.supporter_name || data.payer_name || data.from_name || data.name || 'Generous Supporter';
    const rawAmount = data.amount || data.donation_amount || data.total_amount || 5;
    const note = data.support_note || data.supporter_note || data.message || '';
    
    // Convert USD to approximate INR if currency is USD (approx 1 USD = 85 INR) or use direct value
    let amountInInr = Number(rawAmount);
    if (data.currency === 'USD' || payload.currency === 'USD' || amountInInr < 20) {
      amountInInr = Math.round(amountInInr * 85);
    }

    // Insert into Supabase
    const { error: dbError } = await supabase.from('donations').insert({
      donor_name: donorName.trim(),
      amount: amountInInr,
      display_publicly: true,
    });

    if (dbError) {
      console.error('Database insert error:', dbError);
      return res.status(500).json({ error: 'Database error', details: dbError.message });
    }

    return res.status(200).json({ success: true, message: 'Donation recorded successfully!' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
