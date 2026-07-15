import sponsorsImg from '../assets/hopes-corner-sponsors.png'
import lentesImg from '../assets/lentes-gratis.png'

// communityTab is owned by App, not by this component: a route element unmounts on navigation,
// so local state here would reset the sub-tab every visit. Today it survives.
interface CommunityPageProps {
  communityTab: string
  setCommunityTab: (tab: string) => void
}

function CommunityPage({ communityTab, setCommunityTab }: CommunityPageProps) {
  return (
    <div className="tab-fade-in text-section">
      <div className="community-sub-tabs">
        <button
          onClick={() => setCommunityTab('stories')}
          className={`community-sub-btn ${communityTab === 'stories' ? 'active' : ''}`}
        >Stories</button>
        <button
          onClick={() => setCommunityTab('sponsors')}
          className={`community-sub-btn ${communityTab === 'sponsors' ? 'active' : ''}`}
        >Sponsors &amp; Partners</button>
        <button
          onClick={() => setCommunityTab('resources')}
          className={`community-sub-btn ${communityTab === 'resources' ? 'active' : ''}`}
        >Resources</button>
      </div>

      {communityTab === 'stories' && (
        <div>
          <h2>Stories</h2>
          <p>Real stories from the people who make Hope's Corner what it is — volunteers, guests, and neighbors.</p>
          <div className="story-card">
            <h3>Mikey</h3>
            <p>Mikey found his way back to what he lost — and someone who is very dear to him, his mother.</p>
            <a href="https://www.hopes-corner.org/lost-and-foundhope-for-a-better-future" target="_blank" rel="noreferrer" className="story-link">Read Mikey's story →</a>
          </div>
          <div className="story-card">
            <h3>Saint Claire</h3>
            <p>To family, friends, and neighbors she's Claire Hubel — a mother, wife, and Mountain View resident. But to the guests who come to Hope's Corner on Thursdays to shower, she's "Saint Claire," one of the most dedicated volunteers Hope's Corner has.</p>
            <a href="https://www.hopes-corner.org/saint-claire" target="_blank" rel="noreferrer" className="story-link">Read Saint Claire's story →</a>
          </div>
          <div className="story-card">
            <h3>Bill and Elsa</h3>
            <p>Bill explains how Hope's Corner has provided a safe place to find community as well as a meal and a shower. Video generously provided by KMTV.</p>
            <a href="https://youtu.be/EVyqX03VF_U" target="_blank" rel="noreferrer" className="story-link">Watch Bill and Elsa's video →</a>
          </div>
          <div className="story-card">
            <h3>Susan and Alex Dole</h3>
            <p>"How can we have anyone with food insecurity HERE?" — Susan and Alex share what they learned volunteering in downtown Mountain View and why Hope's Corner's mission stayed with them.</p>
            <a href="https://www.hopes-corner.org/enlightening-and-inspriring-" target="_blank" rel="noreferrer" className="story-link">Read Susan and Alex's story →</a>
          </div>
          <div className="story-card">
            <h3>In Remembrance of Edward Lee Hamm</h3>
            <p>Edward was a long-time client at Hope's Corner, often arriving with his Stanford Continuation Studies book. Born in Marion, South Carolina, he was an enigma — until we became friends.</p>
            <a href="https://www.hopes-corner.org/in-remembrance-of-edward-lee-hamm" target="_blank" rel="noreferrer" className="story-link">Read Marilyn Winkleby's remembrance →</a>
          </div>
          <p style={{ marginTop: '30px', color: 'var(--hc-text-muted)', fontSize: '0.95rem' }}>
            Want to share your own story as a volunteer or guest? Email us at{' '}
            <a href="mailto:info@hopes-corner.org" style={{ color: 'var(--hc-green-primary)' }}>info@hopes-corner.org</a>.
          </p>
        </div>
      )}

      {communityTab === 'sponsors' && (
        <div>
          <h2>Sponsors &amp; Partners</h2>
          <p>Hope's Corner is made possible through the generous support of these organizations and community partners.</p>
          <img
            src={sponsorsImg}
            alt="Hope's Corner Sponsors and Partners"
            style={{ width: '100%', maxWidth: '760px', height: 'auto', display: 'block', margin: '24px auto', borderRadius: '8px', border: '1px solid var(--hc-border)' }}
            onError={(e) => { (e.target as HTMLImageElement).alt = 'Sponsors image unavailable' }}
          />
        </div>
      )}

      {communityTab === 'resources' && (
        <div>
          <h2>Resources</h2>

          <div className="program-block">
            <h3>City of Mountain View — Homeless Services</h3>
            <p>The City collaborates with local agencies, nonprofits, and volunteers to maintain a broad range of support for community members. They also maintain a resource list for low-income and unhoused individuals.</p>
            <a href="https://www.mountainview.gov/our-city/departments/city-managers-office/human-services/homeless-services" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 600 }}>
              View City Resources →
            </a>
          </div>

          <div className="program-block">
            <h3>The United Effort Organization</h3>
            <p>748 Mercy Street, Mountain View · (650) 209-0850</p>
            <p>Services include Public Assistance Programs, Resources, Mentors, and phones. Representatives are available at Hope's Corner on Wednesdays 8am–9am and Saturdays 8:30am–10:30am.</p>
            <a href="http://theunitedeffort.org" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 600 }}>
              theunitedeffort.org →
            </a>
            <br /><br />
            <a href="https://www.theunitedeffort.org/housing/affordable-housing/" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>
              Find affordable housing →
            </a>
          </div>

          <div className="program-block">
            <h3>Adult Eyeglasses — Free, 1st Saturday of Each Month</h3>
            <div className="hours-box">
              <h4>8:00 AM – 10:00 AM · First Saturday of every month</h4>
              <p style={{ margin: 0 }}>At Hope's Corner · 748 Mercy Street, Mountain View</p>
            </div>
            <p>In partnership with the <strong>Stanford Housing Equity Project (SHEP)</strong>, The United Effort Organization provides free glasses for unhoused individuals or recipients of public benefits. Bring your prescription if you have one!</p>
            <img
              src={lentesImg}
              alt="Lentes Gratis — Free Eyeglasses flyer"
              style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', marginTop: '16px', borderRadius: '8px', border: '1px solid var(--hc-border)' }}
              onError={(e) => { (e.target as HTMLImageElement).alt = 'Flyer unavailable' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default CommunityPage
