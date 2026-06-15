import hopesCornerLogo from './assets/Hopes_Corner_Logo_Green.png'
import './App.css'

function App() {
  return (
    <>
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={hopesCornerLogo} alt="Hope's Corner Logo" />
          </div>
          <nav className="nav-tabs">
            <a href="#" className="nav-tab active">Home</a>
            <a href="#" className="nav-tab">Donate</a>
            <a href="#" className="nav-tab">Volunteer</a>
            <a href="#" className="nav-tab">Learn</a>
            <a href="#" className="nav-tab">About</a>
            <a href="#" className="nav-tab">Community</a>
            <a href="#" className="nav-tab">News</a>
            <a href="#" className="nav-tab">Contact</a>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <div className="image-wrapper">
            <img src={new URL('./assets/Website+photo+1.jpeg', import.meta.url).href} alt="Hope's Corner community" className="hero-image" onError={(e) => { (e.target as HTMLImageElement).src = new URL('./assets/Website_photo_1.jpg', import.meta.url).href }} />
          </div>
          <div className="hero-text-box">
            <p className="intro-text">
              Hope’s Corner meets the needs of our community by providing free nutritious meals and warm showers to anyone in need. We believe in one inclusive community that cares for all of its people.
            </p>
          </div>
        </section>

        <section className="services-section">
          <h2>Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <h3>Free Hot Breakfast & Bag Lunches</h3>
              <p>Served every Monday 8am-9am, Wednesday 8am-9am and Saturday 8 am-10 am.</p>
            </div>
            <div className="service-card">
              <h3>Free Shower & Laundry Program</h3>
              <p>Operating hours are Monday 8:30am – noon, Wednesday 8:30 am-noon and Saturday 8:30 am-2pm.</p>
            </div>
          </div>
        </section>

        <section className="location-section">
          <h2>Where to Find Us</h2>
          <p className="location-text">748 Mercy Street in downtown Mountain View. We are at the corner of Hope and Mercy Streets, one block from Castro Street</p>
          <div className="section-barrier"></div>
          <div className="image-wrapper">
            <img src={new URL('./assets/Website+photo+2+(1).jpeg', import.meta.url).href} alt="Location Map" className="map-image" onError={(e) => { (e.target as HTMLImageElement).src = new URL('./assets/Website_photo_2_(1).jpg', import.meta.url).href }} />
          </div>
        </section>

        <section className="thank-you-section">
          <p>We couldn’t serve our community without our dedicated volunteers and generous donors. You are the true heroes. Thank you for being part of our shared mission.</p>
          <div className="action-buttons">
            <a href="#" className="btn btn-primary">Volunteer</a>
            <a href="https://give-usa.keela.co/general-donations20" target="_blank" rel="noreferrer" className="btn btn-secondary">Donate</a>
          </div>
        </section>

        <section className="info-cards-section">
          <div className="info-card">
            <div className="card-image-box">
              <img src={new URL('./assets/Donation+photo.jpeg', import.meta.url).href} alt="Donate" onError={(e) => { (e.target as HTMLImageElement).src = new URL('./assets/Donation_photo.jpg', import.meta.url).href }} />
            </div>
            <h3>Donate</h3>
            <p>We are a tax-exempt nonprofit supported by donations and grants from individuals and organizations.</p>
            <a href="https://www.hopes-corner.org/donate" target="_blank" rel="noreferrer" className="learn-more-link">Learn more &gt;&gt;</a>
          </div>

          <div className="info-card">
            <div className="card-image-box">
              <img src={new URL('./assets/Website+photo+2+(1).jpeg', import.meta.url).href} alt="Volunteer" onError={(e) => { (e.target as HTMLImageElement).src = new URL('./assets/Website_photo_2_(1).jpg', import.meta.url).href }} />
            </div>
            <h3>Volunteer</h3>
            <p>Explore our various volunteer opportunities and guidelines for volunteering with Hope’s Corner.</p>
            <a href="https://www.hopes-corner.org/information-volunteers" target="_blank" rel="noreferrer" className="learn-more-link">Learn more &gt;&gt;</a>
          </div>

          <div className="info-card">
            <div className="card-image-box">
              <img src={new URL('./assets/home-learn.png', import.meta.url).href} alt="Learn" />
            </div>
            <h3>Learn</h3>
            <p>Read about our mission, vision, and values, in addition to learning about who we serve and the services we offer.</p>
            <a href="https://www.hopes-corner.org/about" target="_blank" rel="noreferrer" className="learn-more-link">Learn more &gt;&gt;</a>
          </div>
        </section>

        <section className="newsletter-section">
          <div className="newsletter-box">
            <h3>Subscribe to our Newsletter</h3>
            <p>Stay up to date with news, events, and community impact updates from Hope's Corner.</p>
            <div className="newsletter-form-placeholder">
              <input type="email" placeholder="Your email address" disabled />
              <button type="button" className="btn-subscribe" disabled>Subscribe</button>
            </div>
          </div>
        </section>

        <section className="badges-section">
          <img src={new URL('./assets/2024-top-rated-awards-badge-hi-res.png', import.meta.url).href} alt="2024 Top Rated Awards Badge" className="award-badge" />
          <img src={new URL('./assets/Four-Star+Rating+Badge+-+Full+Color.png', import.meta.url).href} alt="Four Star Rating Badge" className="award-badge" />
          <img src={new URL('./assets/image_826ea5.png', import.meta.url).href} alt="Guidestar Platinum Transparency Badge" className="award-badge" />
        </section>
      </main>

      <footer className="footer">
        <div className="social-links-container">
          <ul className="social-links-list">
            <li>
              <a href="https://www.linkedin.com/company/hopes-corner-org/posts/?feedView=all" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/hopescorner_mv" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/hopescornermv" target="_blank" rel="noreferrer">
                Facebook
              </a>
            </li>
          </ul>
        </div>
        <p>&copy; 2026 Hope's Corner All Rights Reserved.</p>
      </footer>
    </>
  )
}

export default App