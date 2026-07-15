function ContactPage() {
  return (
    <div className="tab-fade-in text-section">
      <h2>Want to know more?</h2>
      <p>Send us an email using the form below or call us at <strong>650-254-1450</strong>.</p>

      <form className="contact-form-placeholder" onSubmit={(e) => e.preventDefault()}>
        <div className="form-group">
          <label>Name</label>
          <input type="text" placeholder="Your Name" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Your Email" />
        </div>
        <div className="form-group">
          <label>Message</label>
          <textarea rows={4} placeholder="How can we help you?" style={{ width: '100%', borderRadius: '7px', border: '1px solid var(--hc-border)', padding: '10px', boxSizing: 'border-box' }}></textarea>
        </div>
        <button className="btn btn-primary" type="button" style={{ width: 'auto' }}>Send Message</button>
      </form>
    </div>
  )
}

export default ContactPage
