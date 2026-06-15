import hopesCornerLogo from './assets/hopes-corner-logo.png'
import './App.css'

function App() {
  return (
    <>
      <section id="center">
        <div className="hero">
          <img
            src={hopesCornerLogo}
            className="logo"
            alt="Hope's Corner - Sharing Meals, Building Community"
          />
        </div>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Learn More</h2>
          <p>About Hope's Corner</p>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Follow Hope's Corner online</p>
          <ul>
            <li>
              <a
                href="https://www.linkedin.com/company/hopes-corner-org/posts/?feedView=all"
                target="_blank"
              >
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#linkedin-icon"></use>
                </svg>
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/hopescorner_mv"
                target="_blank"
              >
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#instagram-icon"></use>
                </svg>
                Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/hopescornermv"
                target="_blank"
              >
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#facebook-icon"></use>
                </svg>
                Facebook
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App