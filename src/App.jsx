import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import qrImage from './assets/qr.png'

const PRESET_AMOUNTS = [51, 101, 251, 501]
const BMAC_URL = 'https://buymeacoffee.com/chinesh'
const PAYPAL_URL = 'https://paypal.me/ChineshSoni'
const UPI_ID = 'chineshsoni2@okaxis' // Your UPI ID

// Reset cutoff timestamp to start clean
const RESET_CUTOFF = '2026-09-25T16:50:00.000Z'

export default function App() {
  const [selectedTab, setSelectedTab] = useState('bmac') // 'bmac' | 'upi'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [amount, setAmount] = useState(101)
  const [customAmount, setCustomAmount] = useState(false)
  const [customVal, setCustomVal] = useState('')
  const [utrNumber, setUtrNumber] = useState('')
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

  // Direct UPI Intent URL for mobile UPI apps
  const upiIntentUrl = `upi://pay?pa=${UPI_ID}&pn=Chinesh%20Soni&am=${effectiveAmount || 101}&cu=INR&tn=Donation%20from%20${encodeURIComponent(name.trim() || 'Supporter')}`

  // Dynamic QR Code URL for desktop/tablets
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiIntentUrl)}&color=090e1a&bgcolor=ffffff`

  async function handleRecordUpiDonation(e) {
    if (e) e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!effectiveAmount || effectiveAmount < 1) {
      setError('Please select or enter a valid amount (minimum ₹1).')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('donations').insert({
        donor_name: name.trim(),
        amount: Number(effectiveAmount),
        display_publicly: true,
      })

      if (dbError) {
        throw dbError
      }

      setStep('done')
      fetchDonors()
    } catch (err) {
      console.error('Failed to submit donation record:', err)
      setError(err.message || 'Could not record entry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setStep('form')
    setName('')
    setEmail('')
    setMessage('')
    setAmount(101)
    setCustomAmount(false)
    setCustomVal('')
    setUtrNumber('')
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
            Support the channel, free open-source tools, and content creation.
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

            {/* PAYMENT METHOD TABS */}
            <div className="method-tabs">
              <button
                type="button"
                className={`tab-btn ${selectedTab === 'bmac' ? 'active' : ''}`}
                onClick={() => setSelectedTab('bmac')}
              >
                ☕ Buy Me a Coffee
              </button>
              <button
                type="button"
                className={`tab-btn ${selectedTab === 'upi' ? 'active' : ''}`}
                onClick={() => setSelectedTab('upi')}
              >
                ⚡ Direct UPI (India)
              </button>
            </div>

            {/* TAB 1: BUY ME A COFFEE (GLOBAL + CARDS + PAYPAL) */}
            {selectedTab === 'bmac' && (
              <div className="bmac-section">
                <div className="bmac-intro-card">
                  <div className="bmac-badge">⭐ Recommended & Instant</div>
                  <h3 className="bmac-title">Support on Buy Me a Coffee</h3>
                  <p className="bmac-desc">
                    Supports <strong>Credit/Debit Cards, Apple Pay, Google Pay, UPI & PayPal</strong> with 0 setup hassle for individual supporters worldwide.
                  </p>

                  <a
                    href={BMAC_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bmac-cta-btn"
                  >
                    <span className="bmac-icon">☕</span>
                    <span>Buy Me a Coffee (chinesh)</span>
                  </a>

                  <div className="bmac-features-list">
                    <span>✓ Global & Indian Cards</span>
                    <span>✓ Apple Pay / Google Pay</span>
                    <span>✓ Instant Donor Acknowledgment</span>
                  </div>
                </div>

                <div className="bmac-manual-ack">
                  <p className="ack-title">Already donated on Buy Me a Coffee or PayPal?</p>
                  <p className="ack-subtitle">Enter your name to appear on the live Donor Wall below:</p>

                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Your Name (as on Buy Me a Coffee)"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="amount-grid mini-grid">
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
                    onClick={handleRecordUpiDonation}
                    disabled={loading || !name.trim() || !effectiveAmount}
                    className="secondary-btn submit-wall-btn"
                  >
                    {loading ? 'Adding...' : 'Add My Name to Donor Wall ✨'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DIRECT UPI (INDIA 0% FEES) */}
            {selectedTab === 'upi' && (
              <div className="upi-section">
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

                {/* QR CODE & UPI DETAILS */}
                <div className="upi-qr-box">
                  <div className="upi-qr-image-wrapper">
                    <img
                      src={dynamicQrUrl}
                      alt="UPI QR Code"
                      className="upi-qr-image"
                      onError={(e) => {
                        e.currentTarget.src = qrImage
                      }}
                    />
                  </div>

                  <div className="upi-details">
                    <span className="upi-id-label">UPI ID:</span>
                    <div className="upi-id-badge">
                      <span>{UPI_ID}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(UPI_ID)
                          alert('UPI ID copied to clipboard!')
                        }}
                        className="copy-btn"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* MOBILE DIRECT UPI APP BUTTON */}
                  <a
                    href={upiIntentUrl}
                    className="upi-intent-btn"
                  >
                    🚀 Open in GPay / PhonePe / Paytm (₹{effectiveAmount || 101})
                  </a>
                </div>

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
                  <label className="field-label">Email or Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Keep up the good work!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="field-label">UPI Ref / UTR No. (Optional)</label>
                  <input
                    type="text"
                    placeholder="12-digit UPI reference number"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    className="input-field"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRecordUpiDonation}
                  disabled={loading || !name.trim() || !effectiveAmount}
                  className="primary-pay-btn"
                >
                  {loading ? 'RECORDING...' : `I HAVE PAID • ₹${effectiveAmount || 0}`}
                </button>
              </div>
            )}

            {/* PAYPAL INTERNATIONAL BACKUP */}
            <div className="paypal-section">
              <p className="paypal-hint">Or donate internationally via PayPal</p>
              <a
                href={PAYPAL_URL}
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
              Thank you <strong>{name}</strong>! Your support of <strong>₹{effectiveAmount}</strong> has been received and listed on the live donor wall.
            </p>
            <button type="button" onClick={resetForm} className="secondary-btn">
              Back to Home
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
            Supported via Buy Me a Coffee, Direct UPI & PayPal
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
                    <strong>MR.SAFFRONYT</strong> is an independent content creation and software engineering initiative by <strong>Chinesh Soni</strong>. We create online video content, guides, and digital resources for our community.
                  </p>
                  <h4>Purpose of Support</h4>
                  <p>
                    Contributions made on this page are voluntary supporter donations that help fund ongoing content creation, video production, open-source projects, and community initiatives.
                  </p>
                </div>
              )}

              {activeModal === 'contact' && (
                <div className="policy-text">
                  <h4>Contact Information</h4>
                  <p>For any queries, support, or assistance, please contact:</p>
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
                    <li>Payments are processed securely via Buy Me a Coffee, Direct UPI, or PayPal.</li>
                    <li>These terms are governed by the applicable laws of India.</li>
                  </ol>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="policy-text">
                  <h4>Privacy Policy</h4>
                  <p>
                    We respect your privacy. Any personal information submitted (such as your name and optional note) is used strictly for donor acknowledgment on the wall.
                  </p>
                  <p>
                    We never sell or share your information with third-party advertisers.
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
                    <strong>Erroneous or Duplicate Transactions:</strong> If you experienced a duplicate charge or unauthorized transaction, please email <strong>chineshsoni2@gmail.com</strong> with your payment details for assistance.
                  </p>
                </div>
              )}

              {activeModal === 'fulfillment' && (
                <div className="policy-text">
                  <h4>Pricing & Fulfillment</h4>
                  <p>
                    <strong>Pricing:</strong> Contributions are voluntary one-time amounts with no recurring hidden fees.
                  </p>
                  <p>
                    <strong>Fulfillment:</strong> This website provides creator patronage. There are no physical products shipped. Digital acknowledgment on the donor wall is immediate.
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