import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div className="tab-fade-in">
      <section className="hero-section">
        <div className="image-wrapper">
          <img
            src={new URL('../assets/Website+photo+1.jpeg', import.meta.url).href}
            alt="Hope's Corner community"
            className="hero-image"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=1100' }}
          />
        </div>
        <div className="hero-text-box">
          <p className="intro-text">
            Hope’s Corner meets the needs of our community by providing free nutritious meals and warm showers to anyone in need. We believe in one inclusive community that cares for all of its people.
          </p>
          <div className="hero-cta-row">
            <Link to="/volunteer" className="btn-cta">Volunteer With Us</Link>
            <Link to="/donate" className="btn-cta-outline">Donate</Link>
          </div>
        </div>
      </section>

      <section className="impact-strip" aria-label="2024 impact">
        <div className="impact-stat">
          <span className="impact-number">50,189</span>
          <span className="impact-label">Hot Meals in 2024</span>
        </div>
        <div className="impact-stat">
          <span className="impact-number">2,902</span>
          <span className="impact-label">Warm Showers</span>
        </div>
        <div className="impact-stat">
          <span className="impact-number">989</span>
          <span className="impact-label">Volunteers</span>
        </div>
        <div className="impact-stat">
          <span className="impact-number">12,538</span>
          <span className="impact-label">Volunteer Hours</span>
        </div>
      </section>

      <section className="services-section">
        <span className="section-eyebrow">What We Do</span>
        <h2>Our Essential Services</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Free Hot Breakfast &amp; Bag Lunches</h3>
            <p>Served every Monday 8am-9am, Wednesday 8am-9am and Saturday 8am-10am.</p>
          </div>
          <div className="service-card">
            <h3>Free Shower &amp; Laundry Program</h3>
            <p>Operating hours are Monday 8:30am – noon, Wednesday 8:30am-noon and Saturday 8:30am-2pm.</p>
          </div>
        </div>
      </section>

      <section className="location-section">
        <span className="section-eyebrow">Visit Us</span>
        <h2>Where to Find Us</h2>
        <p className="location-text">748 Mercy Street in downtown Mountain View. We are at the corner of Hope and Mercy Streets, one block from Castro Street.</p>
        <div className="section-barrier"></div>
        <div className="image-wrapper">
          <img
            src={new URL('../assets/Website+photo+2+(1).jpeg', import.meta.url).href}
            alt="Location Map"
            className="map-image"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1100' }}
          />
        </div>
      </section>
    </div>
  )
}

export default HomePage
