export default async function handler(req, res) {
  // CORS configuration
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
    const { amount, donorName, email, phone } = req.body;

    if (!amount || Number(amount) < 1) {
      return res.status(400).json({ error: 'Invalid amount (minimum ₹1)' });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = process.env.CASHFREE_ENV || 'sandbox';

    const baseUrl = env === 'production'
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders';

    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const customerId = `cust_${Date.now()}`;
    const cleanPhone = (phone && phone.replace(/\D/g, '').slice(-10)) || '9876543210';

    const orderPayload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: 'INR',
      customer_details: {
        customer_id: customerId,
        customer_name: (donorName && donorName.trim()) || 'Supporter',
        customer_email: email && email.includes('@') ? email.trim() : 'supporter@donation.com',
        customer_phone: cleanPhone.length === 10 ? cleanPhone : '9876543210',
      },
      order_meta: {
        return_url: `${req.headers.origin || 'https://localhost:5173'}?order_id={order_id}`,
      },
      order_note: `Donation to Chinesh Soni from ${(donorName && donorName.trim()) || 'Supporter'}`,
    };

    const cfResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await cfResponse.json();

    if (!cfResponse.ok) {
      console.error('Cashfree Order Creation Failed:', data);
      return res.status(cfResponse.status).json({
        error: data.message || 'Failed to create Cashfree order.',
      });
    }

    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
    });
  } catch (err) {
    console.error('Server error creating order:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
