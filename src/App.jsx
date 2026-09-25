import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const PRESET_AMOUNTS = [
  { amount: 51, label: '☕ Chai Supporter', desc: 'Fuel a coding session' },
  { amount: 151, label: '🚀 Tutorial Sponsor', desc: 'Back our next in-depth guide' },
  { amount: 501, label: '⭐ Tech Patron', desc: 'Support open-source tools' },
  { amount: 1101, label: '🏆 Community Champion', desc: 'Fund long-term dev projects' },
]

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TgKtDDGPfGk9TF'

export default function App() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState(151)
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
      setError('Please choose or enter a valid amount (minimum ₹1).')
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
        throw new Error(errData.error || 'Failed to initialize payment gateway order.')
      }

      const order = await orderRes.json()

      // Step 2: Open Razorpay Checkout modal
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'MR.SAFFRONYT • Chinesh Soni',
        description: `Creator Community Support by ${name.trim()}`,
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
        setError(response.error?.description || 'Payment was unsuccessful. Please try again.')
        setLoading(false)
      })

      rzp.open()
    } catch (err) {
      setError(err.message || 'Payment processing error. Please try again.')
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
        throw new Error(verifyData.error || 'Cryptographic payment verification failed.')
      }

      // Record in Supabase
      const { error: dbError } = await supabase.from('donations').insert({
        donor_name: name.trim(),
        amount: Number(paidAmount),
        display_publicly: true,
      })

      if (dbError) {
        console.error('Failed to record donor entry in database:', dbError)
      }

      setStep('done')
      fetchDonors()
    } catch (err) {
      setError(err.message || 'Payment verification failed. If money was deducted, it will be auto-refunded.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setAmount(151)
    setCustomAmount(false)
    setCustomVal('')
    setError('')
  }

  return (
    <div className="layout-root">
      {/* Top Navigation */}
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="brand-badge">CREATOR HUB</span>
            <span className="brand-name">MR.SAFFRONYT</span>
          </div>
          <nav className="nav-links">
            <button type="button" onClick={() => setActiveModal('about')} className="nav-link-btn">About</button>
            <button type="button" onClick={() => setActiveModal('contact')} className="nav-link-btn">Contact</button>
            <button type="button" onClick={() => setActiveModal('terms')} className="nav-link-btn">Policies</button>
            <a href="https://github.com/chinesh-soni" target="_blank" rel="noopener noreferrer" className="nav-link-btn external">
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="content-grid">
          
          {/* Left Column: Creator Profile & Mission */}
          <section className="creator-profile-card">
            <div className="creator-avatar-wrap">
              <div className="creator-avatar">CS</div>
              <div className="live-status-pill">
                <span className="pulse-dot"></span> Supporting Community
              </div>
            </div>

            <h1 className="hero-title">
              Support <span className="highlight">Chinesh Soni</span>
            </h1>
            <p className="creator-handle">@MR.SAFFRONYT • Tech Educator & Open-Source Creator</p>

            <p className="mission-text">
              Building open-source developer tools, in-depth coding tutorials, system architectures, and accessible tech education for creators and engineers worldwide.
            </p>

            <div className="metrics-grid">
              <div className="metric-box">
                <span className="metric-label">Total Raised</span>
                <span className="metric-val">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Supporters</span>
                <span className="metric-val">{donors.length}</span>
              </div>
              <div className="metric-box">
                <span className="metric-label">Open Access</span>
                <span className="metric-val">100% Free</span>
              </div>
            </div>

            {/* Impact Highlights */}
            <div className="impact-section">
              <h3 className="impact-title">What Your Support Enables</h3>
              <div className="impact-list">
                <div className="impact-item">
                  <span className="impact-icon">💡</span>
                  <div>
                    <strong>Free Open-Source Tools</strong>
                    <p>Maintaining high-quality GitHub repos, starter templates, and developer kits.</p>
                  </div>
                </div>
                <div className="impact-item">
                  <span className="impact-icon">🎥</span>
                  <div>
                    <strong>High-Quality Tech Guides</strong>
                    <p>Producing deep-dive technical tutorials and zero-cost programming resources.</p>
                  </div>
                </div>
                <div className="impact-item">
                  <span className="impact-icon">🌐</span>
                  <div>
                    <strong>Community Infrastructure</strong>
                    <p>Hosting live demo projects, developer APIs, and open community learning channels.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Transparency Trust Seal */}
            <div className="trust-seal">
              <span className="shield-icon">🛡️</span>
              <p>100% voluntary creator patronage. Secured with 256-bit encryption and processed directly via Razorpay.</p>
            </div>
          </section>

          {/* Right Column: Donation Form & Donor Wall */}
          <section className="interaction-column">
            {error && (
              <div className="alert-box error">
                <span>⚠️ {error}</span>
                <button type="button" onClick={() => setError('')} className="alert-close">✕</button>
              </div>
            )}

            {step === 'form' ? (
              <div className="support-card">
                <div className="card-header">
                  <h2 className="card-title">Choose Your Contribution</h2>
                  <p className="card-subtitle">Every contribution keeps our open-source tools & tutorials free.</p>
                </div>

                <form onSubmit={handlePay}>
                  {/* Preset Tier Selection */}
                  <label className="input-label">Select Contribution Tier</label>
                  <div className="tier-grid">
                    {PRESET_AMOUNTS.map((tier) => (
                      <button
                        type="button"
                        key={tier.amount}
                        onClick={() => {
                          setAmount(tier.amount)
                          setCustomAmount(false)
                        }}
                        className={`tier-btn ${!customAmount && amount === tier.amount ? 'active' : ''}`}
                      >
                        <div className="tier-amount">₹{tier.amount}</div>
                        <div className="tier-label">{tier.label}</div>
                        <div className="tier-desc">{tier.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount Option */}
                  <div className="custom-row">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAmount(true)
                        setAmount(0)
                      }}
                      className={`custom-toggle-btn ${customAmount ? 'active' : ''}`}
                    >
                      + Custom Contribution Amount
                    </button>
                  </div>

                  {customAmount && (
                    <div className="custom-input-group">
                      <span className="currency-prefix">₹</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter amount (e.g. 250)"
                        value={customVal}
                        onChange={(e) => setCustomVal(e.target.value)}
                        className="text-input"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Donor Info Inputs */}
                  <div className="form-group">
                    <label className="input-label">Your Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="input-label">Email Address (Optional — for payment receipt)</label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-input"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !effectiveAmount}
                    className="pay-submit-btn"
                  >
                    {loading ? 'SECURING PAYMENT...' : `SUPPORT WITH RAZORPAY • ₹${effectiveAmount || 0}`}
                  </button>

                  <div className="payment-methods-hint">
                    <span>Supports UPI (Google Pay, PhonePe, Paytm), All Major Debit/Credit Cards & Netbanking</span>
                  </div>

                  {/* PayPal Alternative */}
                  <div className="international-split">
                    <span className="split-line"></span>
                    <span className="split-text">OR INTERNATIONAL</span>
                    <span className="split-line"></span>
                  </div>

                  <a
                    href="https://paypal.me/ChineshSoni"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="paypal-action-btn"
                  >
                    Pay via PayPal (USD / EUR / Global)
                  </a>
                </form>
              </div>
            ) : (
              /* Success Screen */
              <div className="support-card success-card">
                <div className="success-icon">🎉</div>
                <h2 className="success-title">Thank You for Your Support!</h2>
                <p className="success-text">
                  Your contribution of <strong>₹{effectiveAmount}</strong> has been securely processed and verified. Your support directly empowers free education and open-source tools.
                </p>
                <div className="success-badge">✅ Verified Creator Patron</div>
                <button type="button" onClick={resetForm} className="reset-btn">
                  Make Another Contribution
                </button>
              </div>
            )}

            {/* Supporter Wall */}
            <div className="donor-wall-card">
              <div className="wall-header">
                <div>
                  <h3 className="wall-title">Community Supporter Wall</h3>
                  <p className="wall-subtitle">Recent patrons supporting MR.SAFFRONYT</p>
                </div>
                <span className="donor-badge-count">{donors.length} Contributors</span>
              </div>

              {donors.length === 0 ? (
                <div className="empty-wall">
                  <span className="empty-icon">🌟</span>
                  <p>Be the very first community patron!</p>
                </div>
              ) : (
                <div className="donor-items-container">
                  {donors.map((d, index) => (
                    <div key={index} className={`donor-row ${index === 0 ? 'highlight-top' : ''}`}>
                      <div className="donor-avatar-circle">
                        {d.donor_name ? d.donor_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="donor-meta">
                        <div className="donor-name-text">
                          {d.donor_name}
                          {index === 0 && <span className="top-donor-pill">Latest Patron</span>}
                        </div>
                        <div className="donor-date-text">
                          {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                        </div>
                      </div>
                      <div className="donor-amount-text">₹{Number(d.amount).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>
      </main>

      {/* Mandatory Razorpay & RBI Compliance Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand-info">
              <h4>MR.SAFFRONYT • Chinesh Soni</h4>
              <p>Independent Tech Creator & Open-Source Software Platform. Voluntary patronage hub empowering free educational content and digital resources.</p>
            </div>
            <div className="footer-links-group">
              <h5>Legal & Policies</h5>
              <button type="button" onClick={() => setActiveModal('about')}>About Us</button>
              <button type="button" onClick={() => setActiveModal('contact')}>Contact Us</button>
              <button type="button" onClick={() => setActiveModal('terms')}>Terms & Conditions</button>
              <button type="button" onClick={() => setActiveModal('privacy')}>Privacy Policy</button>
              <button type="button" onClick={() => setActiveModal('refund')}>Refund & Cancellation Policy</button>
              <button type="button" onClick={() => setActiveModal('fulfillment')}>Pricing & Fulfillment Policy</button>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Chinesh Soni (MR.SAFFRONYT). All rights reserved.</p>
            <p className="footer-security-note">
              Payments are securely encrypted and handled via Razorpay Gateway (PCI-DSS Level 1 Compliant).
            </p>
          </div>
        </div>
      </footer>

      {/* Compliance Policy Modals */}
      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === 'about' && 'About Us — MR.SAFFRONYT'}
                {activeModal === 'contact' && 'Contact Us & Support'}
                {activeModal === 'terms' && 'Terms and Conditions'}
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'refund' && 'Refund & Cancellation Policy'}
                {activeModal === 'fulfillment' && 'Pricing, Shipping & Fulfillment Policy'}
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body">
              {activeModal === 'about' && (
                <div className="legal-content">
                  <h4>About Chinesh Soni & MR.SAFFRONYT</h4>
                  <p>
                    <strong>MR.SAFFRONYT</strong> is an independent digital media and open-source initiative led by <strong>Chinesh Soni</strong>. Our mission is to produce high-value, freely accessible technical education, software guides, development starter templates, and open-source libraries for students, software engineers, and technology enthusiasts worldwide.
                  </p>
                  <h4>Purpose of Voluntary Patronage</h4>
                  <p>
                    Financial contributions made on this platform are voluntary creator tips / patronage. All funds received are deployed directly towards:
                  </p>
                  <ul>
                    <li>Researching, writing, and producing technical videos and tutorials.</li>
                    <li>Maintaining open-source GitHub repositories, tools, and code templates.</li>
                    <li>Covering cloud infrastructure, server hosting, and development tool subscription costs.</li>
                  </ul>
                  <p>
                    We believe in open knowledge and keep all our primary tutorials and source repositories publicly accessible at zero cost.
                  </p>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="legal-content">
                  <h4>Contact & Creator Support</h4>
                  <p>If you have any questions regarding your contribution, technical inquiries, or need support, please contact us through the following channels:</p>
                  <div className="contact-details-box">
                    <p><strong>Creator / Legal Name:</strong> Chinesh Soni</p>
                    <p><strong>Brand / Entity:</strong> MR.SAFFRONYT</p>
                    <p><strong>Official Email:</strong> chineshsoni2@gmail.com</p>
                    <p><strong>Support & Query Response SLA:</strong> Within 24 to 48 business hours</p>
                    <p><strong>Operating Country:</strong> India</p>
                    <p><strong>GitHub:</strong> <a href="https://github.com/chinesh-soni" target="_blank" rel="noopener noreferrer">github.com/chinesh-soni</a></p>
                  </div>
                </div>
              )}

              {activeModal === 'terms' && (
                <div className="legal-content">
                  <h4>Terms and Conditions</h4>
                  <p>Last updated: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                  <p>
                    By making a contribution on this website, you agree to these Terms and Conditions:
                  </p>
                  <ol>
                    <li><strong>Nature of Transaction:</strong> Payments on this website represent voluntary contributions and patronage in support of independent creator work, software development, and educational materials produced by Chinesh Soni (MR.SAFFRONYT).</li>
                    <li><strong>No Commercial Equity or Guarantee:</strong> Contributions do not represent an investment, loan, or purchase of equity. They do not constitute a contractual purchase of customized consulting services unless explicitly agreed in writing.</li>
                    <li><strong>Accuracy of Information:</strong> You represent that any payment information submitted is genuine and that you are an authorized user of the payment method (Credit Card, Debit Card, UPI, Netbanking).</li>
                    <li><strong>Payment Processing:</strong> Transactions are securely routed via certified payment gateways (Razorpay / PayPal). We do not store raw card numbers or CVVs on our servers.</li>
                    <li><strong>Governing Law:</strong> These terms are governed by the applicable laws of India.</li>
                  </ol>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="legal-content">
                  <h4>Privacy Policy</h4>
                  <p>
                    We value your trust and are committed to protecting your privacy. This policy outlines how information is collected and used.
                  </p>
                  <h4>1. Information We Collect</h4>
                  <p>
                    When you make a contribution, we may collect your name, optional email address, contribution amount, and transaction identifiers generated by our payment processor.
                  </p>
                  <h4>2. How We Use Information</h4>
                  <ul>
                    <li>To authenticate and securely verify your transaction via Razorpay.</li>
                    <li>To display your chosen name on our public Community Supporter Wall (if enabled).</li>
                    <li>To issue payment receipts and confirmations to your email.</li>
                  </ul>
                  <h4>3. Data Security & Storage</h4>
                  <p>
                    We use industry-standard HTTPS encryption. All payment credentials are encrypted and processed by Razorpay (PCI-DSS compliant). We never sell, rent, or trade your personal information to third parties.
                  </p>
                </div>
              )}

              {activeModal === 'refund' && (
                <div className="legal-content">
                  <h4>Refund & Cancellation Policy</h4>
                  <p>
                    Because contributions on this site are voluntary donations and creator patronage that are deployed immediately into content creation and infrastructure maintenance, <strong>contributions are generally considered final and non-refundable</strong>.
                  </p>
                  <h4>Exceptions & Erroneous Transactions</h4>
                  <p>
                    However, we believe in fair handling. A refund will be promptly issued in any of the following circumstances:
                  </p>
                  <ul>
                    <li><strong>Accidental Duplicate Deduction:</strong> If technical errors caused multiple deductions for a single intended contribution.</li>
                    <li><strong>Unauthorized Transaction:</strong> If a transaction was processed without your authorization and reported promptly.</li>
                  </ul>
                  <h4>How to Request a Refund</h4>
                  <p>
                    To request a refund for a duplicate or erroneous charge, email <strong>chineshsoni2@gmail.com</strong> within <strong>7 days</strong> of the transaction with your Payment ID (e.g. <code>pay_xxx</code>) and Order ID. Approved refunds will be credited back to your original payment source within <strong>5 to 7 business days</strong> as per banking and Razorpay standard settlement timelines.
                  </p>
                </div>
              )}

              {activeModal === 'fulfillment' && (
                <div className="legal-content">
                  <h4>Pricing, Shipping & Fulfillment Policy</h4>
                  <h4>1. Pricing Transparency</h4>
                  <p>
                    All contribution amounts are displayed transparently in Indian Rupees (INR, ₹). There are no hidden fees, recurring subscriptions, or surprise recurring charges. Contributions are strictly one-time unless you choose to donate again.
                  </p>
                  <h4>2. Shipping & Delivery of Physical Goods</h4>
                  <p>
                    <strong>No Physical Shipping:</strong> This website provides voluntary creator patronage and digital community access. We do not sell or ship physical merchandise or physical goods; therefore, physical shipping timelines and logistics do not apply.
                  </p>
                  <h4>3. Digital Fulfillment</h4>
                  <p>
                    Digital acknowledgment and inclusion of your name on the Live Community Supporter Wall occurs automatically and instantly upon successful payment verification.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setActiveModal(null)} className="modal-close-action-btn">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}