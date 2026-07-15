import { newsletters } from '../data/newsletters'

// newsTab is owned by App, not by this component: a route element unmounts on navigation,
// so local state here would reset the sub-tab every visit. Today it survives.
interface NewsPageProps {
  newsTab: string
  setNewsTab: (tab: string) => void
}

function NewsPage({ newsTab, setNewsTab }: NewsPageProps) {
  return (
    <div className="tab-fade-in text-section">
      <div className="community-sub-tabs">
        <button
          onClick={() => setNewsTab('press')}
          className={`community-sub-btn ${newsTab === 'press' ? 'active' : ''}`}
        >Press</button>
        <button
          onClick={() => setNewsTab('newsletters')}
          className={`community-sub-btn ${newsTab === 'newsletters' ? 'active' : ''}`}
        >Newsletters</button>
      </div>

      {newsTab === 'press' && (
        <div>
          <h2>Press</h2>
          <ul className="press-list">
            <li><a href="https://www.cbsnews.com/sanfrancisco/news/peninsula-couple-found-joint-ministry-to-feed-support-homeless-residents/" target="_blank" rel="noreferrer">Peninsula couple found joint ministry to feed, support homeless residents</a></li>
            <li><a href="https://www.mv-voice.com/transportation/2026/02/17/changing-gears-local-nonprofits-provide-bikes-to-low-income-residents/" target="_blank" rel="noreferrer">Changing Gears: Local Nonprofits Provide Bikes To Low-Income Residents <span className="press-date">(Mountain View Voice, Feb 2026)</span></a></li>
            <li><a href="https://www.mv-voice.com/community/2025/08/29/community-briefs-art-and-wine-festival-free-bike-repairs-and-mvhs-25-year-reunion/#h-hope-s-corner-expands-free-bicycle-repair-service" target="_blank" rel="noreferrer">Hope's Corner expands free bicycle repair service <span className="press-date">(Aug 2025)</span></a></li>
            <li><a href="https://www.losaltosonline.com/schools/los-altos-teens-reducing-food-waste-by-collecting-produce-for-hope-s-corner/article_4fc53a04-011d-4a0a-a7e4-d9ed0e0b79b9.html" target="_blank" rel="noreferrer">Los Altos teens reducing food waste by collecting produce for Hope's Corner <span className="press-date">(Los Altos Town Crier, Aug 2025)</span></a></li>
            <li><a href="https://www.losaltosonline.com/community/hope-s-corner-building-community-one-meal-and-shower-at-a-time/article_d2c7f398-a146-11ef-8b24-0f8688af63b3.html" target="_blank" rel="noreferrer">Hope's Corner: Building community one meal and shower at a time <span className="press-date">(Nov 2024)</span></a></li>
            <li><a href="https://bikex.org/15-about/partners/275-hopes-corner-beacon-of-support" target="_blank" rel="noreferrer">Hope's Corner: A Beacon of Support in Mountain View <span className="press-date">(Oct 2024)</span></a></li>
            <li><a href="https://www.mv-voice.com/community/2024/07/26/community-briefs-hopes-corner-fundraiser-national-night-out-and-a-library-book-sale/" target="_blank" rel="noreferrer">Tour de Hope raises over $15K for Mountain View nonprofit Hope's Corner <span className="press-date">(Jul 2024)</span></a></li>
            <li><a href="https://www.losaltosonline.com/community/foundation-prioritizes-economic-uncertainty-in-round-of-grants/article_d34d02c2-439f-11ef-8866-e7a65b93021f.html" target="_blank" rel="noreferrer">Foundation prioritizes 'economic uncertainty' in round of grants <span className="press-date">(Jul 2024)</span></a></li>
            <li><a href="https://www.losaltosonline.com/community/tour-de-hope-2024-turning-wheels-into-meals/article_da721632-3e27-11ef-82d7-a7ade41b5ba3.html" target="_blank" rel="noreferrer">Tour de Hope 2024: Turning wheels into meals <span className="press-date">(Jul 2024)</span></a></li>
            <li><a href="https://www.mv-voice.com/news/2024/01/05/holiday-fund-hopes-corner-mountain-views-local-weekend-meal-service-strives-to-help-those-in-need" target="_blank" rel="noreferrer">Holiday Fund: Hope's Corner, Mountain View's local weekend meal service <span className="press-date">(Jan 2024)</span></a></li>
            <li><a href="https://www.losaltosonline.com/holidayfund/hope-s-corner-providing-hot-meals-showers-for-vulnerable-residents/article_9df50702-7daf-11ee-adc5-4b20b17e338b.html" target="_blank" rel="noreferrer">Hope's Corner: Providing hot meals, showers for vulnerable residents <span className="press-date">(Nov 2023)</span></a></li>
            <li><a href="https://www.mv-voice.com/news/2023/09/18/hopes-corner-in-mountain-view-offers-first-sit-down-meal-service-since-the-start-of-the-pandemic" target="_blank" rel="noreferrer">Hope's Corner in Mountain View offers first sit-down meal service since the pandemic <span className="press-date">(Sep 2023)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/hope-s-corner-marks-milestone-with-200-000th-meal-served/article_ccb30fb0-46a2-11ee-a841-4ffc7947beaa.html" target="_blank" rel="noreferrer">Hope's Corner marks milestone with 200,000th meal served <span className="press-date">(Aug 2023)</span></a></li>
            <li><a href="https://www.losaltosonline.com/community/hope-s-corner-tour-de-hope-fundraiser-returns-july-21/article_bc95ca22-0239-11ed-a0b0-1366cda783c3.html" target="_blank" rel="noreferrer">Hope's Corner Tour de Hope fundraiser returns July 21 <span className="press-date">(Jul 2022)</span></a></li>
            <li><a href="https://www.mv-voice.com/news/2022/07/07/tour-de-hope-bike-fundraiser-is-full-speed-ahead-after-two-year-hiatus" target="_blank" rel="noreferrer">Tour de Hope bike fundraiser is full speed ahead after two-year hiatus <span className="press-date">(Jul 2022)</span></a></li>
            <li><a href="https://lavozdeanza.com/features/2022/06/18/a-de-anza-student-reflects-on-finding-power-and-community/" target="_blank" rel="noreferrer">A De Anza student reflects on finding power and community <span className="press-date">(Jun 2022)</span></a></li>
            <li><a href="https://mv-voice.com/news/2022/03/11/mountain-view-fire-department-offers-helping-hand-after-resident-was-struck-by-a-car" target="_blank" rel="noreferrer">Mountain View Fire Department offers helping hand after resident was struck by a car <span className="press-date">(Mar 2022)</span></a></li>
            <li><a href="https://www.losaltosonline.com/community/a-cut-above-mtn-view-s-hope-s-corner-offers-free-spa-day-for-the/article_27f9a222-c337-11eb-b6f8-c3e90a293584.html" target="_blank" rel="noreferrer">Haircuts for the homeless at Spa Day <span className="press-date">(Jun 2021)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/64226-hope-s-corner-showers-reopen-for-homeless" target="_blank" rel="noreferrer">Hope's Corner reopens showers for the homeless <span className="press-date">(Mar 2021)</span></a></li>
            <li><a href="https://www.mv-voice.com/news/2021/02/12/hopes-corner-serves-its-100000th-meal" target="_blank" rel="noreferrer">Hope's Corner serves its 100,000th meal <span className="press-date">(Mountain View Voice, Feb 2021)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63913-hope-s-corner-serves-100-000th-meal" target="_blank" rel="noreferrer">Hope's Corner serves 100,000th meal <span className="press-date">(Los Altos Town Crier, Feb 2021)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/178-upcoming-events/63723-hope-s-corner-seeks-toy-gift-card-donations" target="_blank" rel="noreferrer">Hope's Corner seeks toy, gift-card donations <span className="press-date">(Dec 2020)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63554-local-boy-scouts-decorate-grocery-bags-for-nonprofit-group" target="_blank" rel="noreferrer">Local Boy Scouts decorate grocery bags for nonprofit group <span className="press-date">(Nov 2020)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/63109-high-school-volunteer-hosts-virtual-fundraiser-for-hope-s-corner" target="_blank" rel="noreferrer">High school volunteer hosts virtual fundraiser for Hope's Corner <span className="press-date">(Sep 2020)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/62925-hope-s-corner-hosts-virtual-5k-fundraiser-for-one-more-week" target="_blank" rel="noreferrer">Hope's Corner hosts virtual 5K fundraiser for one more week <span className="press-date">(Jul 2020)</span></a></li>
            <li><a href="https://mv-voice.com/news/2020/06/07/guest-opinion-hopes-corner-launches-new-services-in-response-to-coronavirus-pandemic" target="_blank" rel="noreferrer">Guest opinion: Hope's Corner launches new services in response to coronavirus pandemic <span className="press-date">(Jun 2020)</span></a></li>
            <li><a href="https://www.losaltosonline.com/news/sections/community/177-features/62370-homeless-at-hope-s-corner-get-empowered-with-chargers" target="_blank" rel="noreferrer">Homeless at Hope's Corner get 'empowered' with chargers <span className="press-date">(Apr 2020)</span></a></li>
            <li><a href="https://www.mv-voice.com/news/2019/05/15/major-upgrades-transform-downtown-church-into-hub-of-homeless-services" target="_blank" rel="noreferrer">Major upgrades transform downtown church into hub of homeless services <span className="press-date">(May 2019)</span></a></li>
          </ul>
        </div>
      )}

      {newsTab === 'newsletters' && (
        <div>
          <h2>Newsletters</h2>
          <p>Read our past newsletters to stay connected with Hope's Corner's community and programs.</p>
          <div className="newsletter-grid">
            {newsletters.map(({ label, url }) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" className="newsletter-chip">
                📄 {label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NewsPage
