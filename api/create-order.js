import Razorpay from 'razorpay';

export default async function handler(req, res) {
  // Handle CORS preflight
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
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await razorpay.orders.create({
      amount: Number(amount),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);

    if (error.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed. Check API keys.' });
    }

    return res.status(500).json({ error: 'Failed to create order. Please try again.' });
  }
}
