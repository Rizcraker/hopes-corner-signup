function DonatePage() {
  return (
    <div className="tab-fade-in text-section">
      <span className="section-eyebrow">Give Hope</span>
      <h2>Support Our Mission</h2>
      <p>We are a tax-exempt nonprofit supported entirely by donations and community grants from individuals and organizations alike. Every dollar goes directly toward meals, showers, laundry, and care for our neighbors in need.</p>

      <div className="services-grid">
        <div className="service-card">
          <h3>🍳 Fund a Meal</h3>
          <p>Your gift helps us serve over 50,000 hot, nutritious meals a year to anyone who is hungry — no questions asked.</p>
        </div>
        <div className="service-card">
          <h3>🚿 Restore Dignity</h3>
          <p>Donations keep our free shower and laundry program running three days a week for unhoused neighbors.</p>
        </div>
      </div>

      <div style={{ margin: '10px 0 30px' }}>
        <a href="https://give-usa.keela.co/general-donations20" target="_blank" rel="noreferrer" className="btn-cta" style={{ boxShadow: '0 4px 14px rgba(34, 99, 77, 0.35)', background: 'var(--hc-green-primary)' }}>
          Make a General Donation via Keela
        </a>
      </div>
      <p className="note-text">Hope's Corner is a 501(c)(3) nonprofit — donations are tax-deductible to the extent allowed by law.</p>
    </div>
  )
}

export default DonatePage
