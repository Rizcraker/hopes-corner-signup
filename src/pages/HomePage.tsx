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
        </div>
      </section>

      <section className="services-section">
        <h2>Our Essential Services</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Free Hot Breakfast & Bag Lunches</h3>
            <p>Served every Monday 8am-9am, Wednesday 8am-9am and Saturday 8am-10am.</p>
          </div>
          <div className="service-card">
            <h3>Free Shower & Laundry Program</h3>
            <p>Operating hours are Monday 8:30am – noon, Wednesday 8:30am-noon and Saturday 8:30am-2pm.</p>
          </div>
        </div>
      </section>

      <section className="location-section">
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
