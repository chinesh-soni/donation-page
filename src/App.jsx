import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const PRESET_AMOUNTS = [51, 101, 251, 501]
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TgKtDDGPfGk9TF'

// Reset cutoff timestamp to start clean at ₹0 and 0 donors
const RESET_CUTOFF = '2026-09-25T16:50:00.000Z'

export default function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(101)
  const [customAmount, setCustomAmount] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'done'
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [activeModal, setActiveModal] = useState(null) // 'about' | 'contact' | 'terms' | 'privacy' | 'refund' | 'fulfillment'

  useEffect(() => {
    fetchDonors()
    const channel = supabase
      .channel('donations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, fetchDonors)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchDonors() {
    try {
      const { data } = await supabase
        .from('donations')
        .select('donor_name, amount, created_at')
        .eq('display_publicly', true)
        .gte('created_at', RESET_CUTOFF)
        .order('created_at', { ascending: false })
      if (data) {
        setDonors(data)
        setTotal(data.reduce((sum, d) => sum + Number(d.amount), 0))
      }
    } catch (err) {
      console.error('Error fetching donors:', err)
    }
  }

  const effectiveAmount = customAmount ? Number(customVal) : Number(amount)

  async function handlePay(e) {
    if (e) e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!effectiveAmount || effectiveAmount < 1) {
      setError('Please enter a valid amount (minimum ₹1).')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Step 1: Create order on backend
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: effectiveAmount * 100 }), // paise
      })

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to initialize payment.')
      }

      const order = await orderRes.json()

      // Step 2: Open Razorpay Checkout modal
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'MR.SAFFRONYT',
        description: `Support from ${name.trim()}`,
        order_id: order.id,
        handler: async (response) => {
          await verifyAndRecordPayment(response, effectiveAmount)
        },
        prefill: {
          name: name.trim(),
          email: email.trim() || undefined,
        },
        theme: {
          color: '#f5a623',
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
          },
        },
      }

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.')
      }

      const rzp = new window.Razorpay(options)

      rzp.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment was unsuccessful.')
        setLoading(false)
      })

      rzp.open()
    } catch (err) {
      setError(err.message || 'Payment error. Please try again.')
      setLoading(false)
    }
  }

  async function verifyAndRecordPayment(paymentResponse, paidAmount) {
    try {
      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        }),
      })

      const verifyData = await verifyRes.json().catch(() => ({}))

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed.')
      }

      // Record in Supabase
      const { error: dbError } = await supabase.from('donations').insert({
        donor_name: name.trim(),
        amount: Number(paidAmount),
        display_publicly: true,
      })

      if (dbError) {
        console.error('Failed to record donor entry:', dbError)
      }

      setStep('done')
      fetchDonors()
    } catch (err) {
      setError(err.message || 'Verification error. Please reach out if money was deducted.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setAmount(101)
    setCustomAmount(false)
    setCustomVal('')
    setError('')
  }

  return (
    <div className="mobile-app-wrapper">
      <div className="mobile-app-container">

        {/* HEADER */}
        <header className="app-header">
          <div className="brand-tag">MR.SAFFRONYT</div>
          <h1 className="app-title">
            SUPPORT <span className="highlight">CHINESH SONI</span>
          </h1>
          <p className="app-subtitle">
            Support the channel and content creation.
          </p>

          <div className="stats-pill">
            <div className="stat-col">
              <span className="stat-label">Total Raised</span>
              <span className="stat-value">₹{total.toLocaleString('en-IN')}</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-col">
              <span className="stat-label">Supporters</span>
              <span className="stat-value">{donors.length}</span>
            </div>
          </div>
        </header>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="alert-box">
            <span>⚠️ {error}</span>
            <button type="button" onClick={() => setError('')} className="alert-close">✕</button>
          </div>
        )}

        {/* STEP: FORM */}
        {step === 'form' ? (
          <div className="card form-card">
            <h2 className="card-heading">CHOOSE AMOUNT</h2>

            <div className="amount-grid">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => {
                    setAmount(a)
                    setCustomAmount(false)
                  }}
                  className={`amount-pill ${!customAmount && amount === a ? 'active' : ''}`}
                >
                  ₹{a}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setCustomAmount(true)
                setAmount(0)
              }}
              className={`custom-pill-btn ${customAmount ? 'active' : ''}`}
            >
              + Enter custom amount
            </button>

            {customAmount && (
              <div className="custom-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={customVal}
                  onChange={(e) => setCustomVal(e.target.value)}
                  className="input-field custom-number-input"
                  autoFocus
                />
              </div>
            )}

            <div className="input-group">
              <label className="field-label">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="field-label">Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={loading || !name.trim() || !effectiveAmount}
              className="primary-pay-btn"
            >
              {loading ? 'PROCESSING...' : `PROCEED TO PAY • ₹${effectiveAmount || 0}`}
            </button>

            <div className="paypal-section">
              <p className="paypal-hint">Or pay internationally via PayPal</p>
              <a
                href="https://paypal.me/ChineshSoni"
                target="_blank"
                rel="noopener noreferrer"
                className="paypal-link-btn"
              >
                PAY WITH PAYPAL
              </a>
            </div>
          </div>
        ) : (
          /* STEP: DONE */
          <div className="card success-card">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">THANK YOU!</h2>
            <p className="success-message">
              Your payment of <strong>₹{effectiveAmount}</strong> was successfully verified. Thank you for your support!
            </p>
            <button type="button" onClick={resetForm} className="secondary-btn">
              Donate Again
            </button>
          </div>
        )}

        {/* DONOR WALL */}
        <div className="donor-wall-card">
          <div className="wall-header">
            <h3 className="wall-title">
              DONOR <span className="highlight">WALL</span>
            </h3>
            <span className="wall-count">
              {donors.length} supporter{donors.length !== 1 ? 's' : ''}
            </span>
          </div>

          {donors.length === 0 ? (
            <div className="empty-wall-box">
              Be the first to support! 🚀
            </div>
          ) : (
            <div className="donor-list">
              {donors.map((d, index) => (
                <div key={index} className={`donor-item ${index === 0 ? 'top-item' : ''}`}>
                  <div className="donor-avatar">
                    {d.donor_name ? d.donor_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="donor-details">
                    <div className="donor-name">{d.donor_name}</div>
                    <div className="donor-date">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                    </div>
                  </div>
                  <div className="donor-amount">₹{Number(d.amount).toLocaleString('en-IN')}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COMPLIANCE & LEGAL FOOTER */}
        <footer className="app-footer">
          <div className="policy-links">
            <button type="button" onClick={() => setActiveModal('about')}>About Us</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveModal('contact')}>Contact Us</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveModal('terms')}>Terms</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveModal('privacy')}>Privacy</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveModal('refund')}>Refunds</button>
            <span>•</span>
            <button type="button" onClick={() => setActiveModal('fulfillment')}>Pricing</button>
          </div>
          <p className="copyright-text">
            © {new Date().getFullYear()} Chinesh Soni (MR.SAFFRONYT). All rights reserved.
          </p>
          <p className="security-subtext">
            Secured via Razorpay Payment Gateway (PCI-DSS Compliant)
          </p>
        </footer>

      </div>

      {/* COMPLIANCE MODALS */}
      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === 'about' && 'About Us'}
                {activeModal === 'contact' && 'Contact Us'}
                {activeModal === 'terms' && 'Terms & Conditions'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'refund' && 'Refund & Cancellation Policy'}
                {activeModal === 'fulfillment' && 'Pricing & Fulfillment'}
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="modal-close">✕</button>
            </div>

            <div className="modal-content">
              {activeModal === 'about' && (
                <div className="policy-text">
                  <h4>About Chinesh Soni (MR.SAFFRONYT)</h4>
                  <p>
                    <strong>MR.SAFFRONYT</strong> is an independent content creation initiative by <strong>Chinesh Soni</strong>. We create online video content, guides, and digital resources for our community.
                  </p>
                  <h4>Purpose of Support</h4>
                  <p>
                    Contributions made on this page are voluntary supporter donations that help fund ongoing content creation, video production, and community initiatives.
                  </p>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="policy-text">
                  <h4>Contact Information</h4>
                  <p>For any queries, support, or transaction assistance, please contact:</p>
                  <div className="contact-box">
                    <p><strong>Name:</strong> Chinesh Soni</p>
                    <p><strong>Brand:</strong> MR.SAFFRONYT</p>
                    <p><strong>Email:</strong> chineshsoni2@gmail.com</p>
                    <p><strong>Location:</strong> India</p>
                    <p><strong>Response Time:</strong> Within 24-48 business hours</p>
                  </div>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="policy-text">
                  <h4>Terms & Conditions</h4>
                  <p>By contributing on this page, you agree to the following terms:</p>
                  <ol>
                    <li>Payments are voluntary contributions in support of creator Chinesh Soni (MR.SAFFRONYT).</li>
                    <li>Contributions do not constitute commercial investment, loan, or guaranteed commercial deliverables.</li>
                    <li>All transactions are processed through authorized payment gateways (Razorpay / PayPal).</li>
                    <li>These terms are governed by the applicable laws of India.</li>
                  </ol>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="policy-text">
                  <h4>Privacy Policy</h4>
                  <p>
                    We respect your privacy. Any personal information submitted (such as your name and optional email) is used strictly for payment verification, receipt generation, and displaying your name on the donor wall.
                  </p>
                  <p>
                    Payment data is encrypted and handled securely by Razorpay. We do not store or process raw credit/debit card numbers on our servers.
                  </p>
                </div>
              )}

              {activeModal === 'refund' && (
                <div className="policy-text">
                  <h4>Refund & Cancellation Policy</h4>
                  <p>
                    Because contributions are voluntary creator donations deployed directly into content creation, they are generally non-refundable.
                  </p>
                  <p>
                    <strong>Erroneous or Duplicate Transactions:</strong> If you experienced a duplicate charge or unauthorized transaction, please email <strong>chineshsoni2@gmail.com</strong> within 7 days with your payment details. Verified refund requests will be refunded to your original payment method within 5–7 business days.
                  </p>
                </div>
              )}

              {activeModal === 'fulfillment' && (
                <div className="policy-text">
                  <h4>Pricing & Fulfillment</h4>
                  <p>
                    <strong>Pricing:</strong> All amounts are listed in Indian Rupees (INR, ₹). Transactions are one-time payments with no recurring subscription fees.
                  </p>
                  <p>
                    <strong>Fulfillment:</strong> This website provides creator patronage. There are no physical products shipped. Digital acknowledgment on the donor wall is immediate upon successful transaction.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setActiveModal(null)} className="modal-done-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}