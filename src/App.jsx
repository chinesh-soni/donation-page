import { useState } from 'react'
import qrImage from './assets/qr.png'

const BMAC_URL = 'https://buymeacoffee.com/chinesh'
const PAYPAL_URL = 'https://paypal.me/ChineshSoni'
const UPI_ID = 'chineshsoni2@okhdfcbank'
const UPI_INTENT_URL = `upi://pay?pa=${UPI_ID}&pn=Chinesh%20Soni&cu=INR`

export default function App() {
  const [copied, setCopied] = useState(false)
  const [activeModal, setActiveModal] = useState(null)

  function handleCopy() {
    navigator.clipboard.writeText(UPI_ID)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            Scan using any UPI App (Google Pay, PhonePe, Paytm) to support the channel and creator directly.
          </p>
        </header>

        {/* MAIN CARD: MANUAL UPI QR CODE */}
        <div className="card qr-main-card">
          <div className="qr-badge">⚡ Instant 0% Fee UPI Support</div>

          {/* QR CODE CONTAINER */}
          <div className="upi-qr-image-wrapper">
            <img
              src={qrImage}
              alt="Chinesh Soni Google Pay UPI QR Code"
              className="upi-qr-image"
            />
          </div>

          {/* UPI ID BADGE & COPY BUTTON */}
          <div className="upi-details">
            <span className="upi-id-label">UPI ID:</span>
            <div className="upi-id-badge">
              <span>{UPI_ID}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="copy-btn"
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* MOBILE DIRECT APP LINK */}
          <a
            href={UPI_INTENT_URL}
            className="upi-intent-btn"
          >
            🚀 Open in Google Pay / PhonePe / Paytm
          </a>

          {/* ALTERNATIVE OPTIONS (BUY ME A COFFEE & PAYPAL) */}
          <div className="alt-support-section">
            <div className="alt-divider-text">
              <span>OR SUPPORT GLOBALLY</span>
            </div>

            <div className="alt-buttons-grid">
              <a
                href={BMAC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bmac-cta-btn"
              >
                <span className="bmac-icon">☕</span>
                <span>Buy Me a Coffee</span>
              </a>

              <a
                href={PAYPAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="paypal-link-btn"
              >
                <span>🅿️ Pay with PayPal</span>
              </a>
            </div>
          </div>

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
            Supported via Direct UPI, Buy Me a Coffee & PayPal
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
                    <strong>MR.SAFFRONYT</strong> is an independent content creation and software engineering hub by <strong>Chinesh Soni</strong>. We create online video content, guides, and digital resources.
                  </p>
                  <h4>Purpose of Support</h4>
                  <p>
                    Contributions made on this page are voluntary supporter donations that directly fund content creation, video production, open-source projects, and community initiatives.
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
                    <li>Payments are voluntary contributions in direct support of creator Chinesh Soni.</li>
                    <li>Contributions do not constitute commercial investment, loan, or guaranteed commercial deliverables.</li>
                    <li>Payments are processed securely via Direct UPI, Buy Me a Coffee, or PayPal.</li>
                    <li>These terms are governed by the applicable laws of India.</li>
                  </ol>
                </div>
              )}

              {activeModal === 'privacy' && (
                <div className="policy-text">
                  <h4>Privacy Policy</h4>
                  <p>
                    We respect your privacy. Transactions made through UPI, Buy Me a Coffee, or PayPal are handled securely by their respective authorized applications.
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
                    <strong>Assistance:</strong> If you experienced an accidental transaction error, please email <strong>chineshsoni2@gmail.com</strong> with your transaction reference.
                  </p>
                </div>
              )}

              {activeModal === 'fulfillment' && (
                <div className="policy-text">
                  <h4>Pricing & Fulfillment</h4>
                  <p>
                    <strong>Pricing:</strong> Contributions are voluntary one-time amounts chosen by the supporter.
                  </p>
                  <p>
                    <strong>Fulfillment:</strong> This website provides creator patronage. There are no physical products shipped.
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