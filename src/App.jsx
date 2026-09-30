import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const PRESET_AMOUNTS = [51, 101, 251, 501]
const BMAC_URL = 'https://buymeacoffee.com/chinesh'
const PAYPAL_URL = 'https://paypal.me/ChineshSoni'
const RESET_CUTOFF = '2026-09-25T16:50:00.000Z'

export default function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState(101)
  const [customAmount, setCustomAmount] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'done'
  const [donors, setDonors] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [activeModal, setActiveModal] = useState(null)

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

  async function handleCashfreePayment(e) {
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
      // 1. Create order on backend
      const orderRes = await fetch('/api/create-cashfree-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmount,
          donorName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      })

      const orderData = await orderRes.json()

      if (!orderRes.ok || !orderData.payment_session_id) {
        throw new Error(orderData.error || 'Failed to initialize payment session.')
      }

      if (!window.Cashfree) {
        throw new Error('Cashfree SDK is loading. Please check your internet connection.')
      }

      // 2. Initialize Cashfree PG SDK
      const cashfree = window.Cashfree({
        mode: 'sandbox', // Use 'sandbox' for test, 'production' for live
      })

      // 3. Open Cashfree Checkout Modal
      cashfree.checkout({
        paymentSessionId: orderData.payment_session_id,
        redirectTarget: '_modal',
      }).then(async (result) => {
        if (result.error) {
          setError(result.error.message || 'Payment was canceled or failed.')
          setLoading(false)
        }
        if (result.paymentDetails) {
          await verifyAndRecord(orderData.order_id, effectiveAmount)
        }
      })

    } catch (err) {
      console.error('Payment error:', err)
      setError(err.message || 'An error occurred while starting payment.')
      setLoading(false)
    }
  }

  async function verifyAndRecord(orderId, paidAmount) {
    try {
      const verifyRes = await fetch('/api/verify-cashfree-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          donorName: name.trim(),
          amount: paidAmount,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed.')
      }

      setStep('done')
      fetchDonors()
    } catch (err) {
      setError(err.message || 'Could not verify payment status.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setPhone('')
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
            Support the channel, open-source tools, and content creation.
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
              <label className="field-label">Your Name *</label>
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
              <label className="field-label">Phone Number (Optional)</label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
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
              onClick={handleCashfreePayment}
              disabled={loading || !name.trim() || !effectiveAmount}
              className="primary-pay-btn"
            >
              {loading ? 'OPENING CASHFREE...' : `PAY VIA CASHFREE • ₹${effectiveAmount || 0}`}
            </button>

            <div className="payment-support-badges">
              <span>⚡ Supports UPI (Google Pay, PhonePe, Paytm, BHIM)</span>
              <span>💳 Credit/Debit Cards, NetBanking & Wallets</span>
            </div>

            {/* INTERNATIONAL DONORS */}
            <div className="international-section">
              <p className="intl-hint">International Donors</p>
              <div className="intl-buttons">
                <a
                  href={BMAC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bmac-link-btn"
                >
                  ☕ Buy Me a Coffee
                </a>
                <a
                  href={PAYPAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="paypal-link-btn"
                >
                  PayPal
                </a>
              </div>
            </div>

          </div>
        ) : (
          /* STEP: DONE */
          <div className="card success-card">
            <div className="success-icon">🎉</div>
            <h2 className="success-title">THANK YOU!</h2>
            <p className="success-message">
              Thank you <strong>{name}</strong>! Your contribution of <strong>₹{effectiveAmount}</strong> was successfully completed via Cashfree and is live on the donor wall.
            </p>
            <button type="button" onClick={resetForm} className="secondary-btn">
              Support Again
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

        {/* COMPLIANCE FOOTER */}
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
            Secured via Cashfree Payments (PCI-DSS Level 1 Compliant)
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
                    <strong>MR.SAFFRONYT</strong> is an independent content creation and software engineering hub by <strong>Chinesh Soni</strong>. We create online videos, guides, and open resources.
                  </p>
                  <h4>Purpose of Support</h4>
                  <p>
                    Contributions made on this page are voluntary supporter donations that fund channel content, video production, and community software.
                  </p>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="policy-text">
                  <h4>Contact Information</h4>
                  <div className="contact-box">
                    <p><strong>Name:</strong> Chinesh Soni</p>
                    <p><strong>Brand:</strong> MR.SAFFRONYT</p>
                    <p><strong>Email:</strong> chineshsoni2@gmail.com</p>
                    <p><strong>Response Time:</strong> Within 24-48 business hours</p>
                  </div>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="policy-text">
                  <h4>Terms & Conditions</h4>
                  <ol>
                    <li>Payments are voluntary contributions in support of creator Chinesh Soni.</li>
                    <li>Contributions do not constitute commercial investment, loan, or guaranteed deliverables.</li>
                    <li>All payments are processed securely through Cashfree Payments.</li>
                  </ol>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="policy-text">
                  <h4>Privacy Policy</h4>
                  <p>
                    Donor data is encrypted and handled securely through Cashfree's PCI-DSS compliant infrastructure. We do not store credit/debit card numbers on our servers.
                  </p>
                </div>
              )}

              {activeModal === 'refund' && (
                <div className="policy-text">
                  <h4>Refund & Cancellation Policy</h4>
                  <p>
                    Contributions are voluntary creator donations. In case of erroneous or duplicate charges, email <strong>chineshsoni2@gmail.com</strong> with your payment details for assistance.
                  </p>
                </div>
              )}

              {activeModal === 'fulfillment' && (
                <div className="policy-text">
                  <h4>Pricing & Fulfillment</h4>
                  <p>
                    All amounts are voluntary one-time amounts in INR (₹). Acknowledgment on the live donor wall is immediate.
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