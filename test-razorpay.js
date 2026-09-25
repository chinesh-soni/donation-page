import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: 'rzp_test_TgKtDDGPfGk9TF',
  key_secret: 'm9sl3q4cnWCsjB6OjZQphcop',
});

razorpay.orders.create({
  amount: 100,
  currency: 'INR',
  receipt: 'test_rcpt_1'
}).then(order => {
  console.log('✅ Razorpay connection successful!');
  console.log('Order created:', JSON.stringify(order, null, 2));
}).catch(err => {
  console.error('❌ Razorpay connection failed:');
  console.error(JSON.stringify(err, null, 2));
});
