function AboutPage() {
  return (
    <div className="tab-fade-in content-page-layout">
      <div className="program-block" style={{ borderLeft: '4px solid var(--hc-danger)', backgroundColor: '#fdf2f2' }}>
        <h3 style={{ color: 'var(--hc-danger)', fontSize: '1.2rem', marginTop: 0 }}>IMPORTANT INFORMATION FOR UNDOCUMENTED GUESTS:</h3>
        <p style={{ marginBottom: 0 }}>We want to remind our community that Hope’s Corner provides a welcoming community for all, regardless of immigration status. We have never asked our community members for their immigration status, and our stance has not changed despite potential changes to immigration enforcement at the federal level.</p>
      </div>

      <h2>Mission, Vision, & Values</h2>
      <p>Hope's Corner became an independent 501 (c)(3) non-profit in 2015. Hope's Corner began as a joint ministry of Mountain View Trinity and Los Altos United Methodist Churches. Our wonderful volunteers include members of many different faith communities, youth and adults from other service organizations and members of the community.</p>

      <div className="services-grid">
        <div className="service-card">
          <h3>Mission</h3>
          <p>We create a community that promotes the well-being of all by providing nutritious meals and warm showers in a caring and collaborative manner</p>
        </div>
        <div className="service-card">
          <h3>Vision</h3>
          <p>We envision a community where no one is hungry</p>
        </div>
      </div>

      <div className="hours-box" style={{ textAlign: 'center' }}>
        <h4 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Values</h4>
        <p style={{ fontWeight: 'bold', margin: '0' }}>Sustainability &nbsp;-&nbsp; Community &nbsp;-&nbsp; Collaboration &nbsp;-&nbsp; Well-Being</p>
      </div>

      <h2>Who We Serve</h2>
      <p>We welcome anyone in need of a nutritious meal, warm shower, and caring community</p>

      <div style={{ margin: '20px 0', borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          width="100%"
          height="400"
          src="https://www.youtube.com/embed/N1uraOliTGE"
          title="Food For Thought || A Short Documentary Film on Food Insecurity"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen>
        </iframe>
      </div>

      <h2>Our Programs and Services</h2>
      <ul>
        <li><strong>Hot breakfast and bag lunch</strong> – Monday, Wednesday & Saturday</li>
        <li><strong>Showers and laundry service</strong> – Monday, Wednesday & Saturday</li>
        <li><strong>Referrals, Advocacy, Bicycle assistance, Clothing & Toiletries, Holiday events</strong></li>
      </ul>

      <p>People are hungry in our community. Even if employed, people earning minimum wage cannot afford both rent and food. People who are unhoused need not only a meal, but a place to feel welcomed. Hope’s Corner is addressing these needs every Monday & Wednesday 8am to 9am and Saturday between 8:00 a.m. and 10:00 a.m. by providing a nutritious breakfast and providing a bag lunch for each person to take. In addition, we offer free showers on Monday, Wednesday and Saturday mornings. Our numbers have grown from a few dozen in our beginning in 2011 to now serving over 1,000 people every month. Besides food, we provide a place for people to feel welcomed and build community. We collaborate with Second Harvest Food Bank, Community Services Agency, Peninsula Food Runners, Silicon Valley Bicycle Exchange and others to help the people we serve connect with other available services.</p>

      <div style={{ fontSize: '0.85rem', color: 'var(--hc-text-muted)', backgroundColor: 'var(--hc-white)', padding: '15px', border: '1px solid var(--hc-border)', borderRadius: '8px', margin: '20px 0' }}>
        <p>In accordance with Federal civil rights law and U.S. Department of Agriculture (USDA) civil rights regulations and policies, the USDA, its Agencies, offices, and employees, and institutions participating in or administering USDA programs are prohibited from discriminating based on race, color, national origin, sex, disability, age, or reprisal or retaliation for prior civil rights activity in any program or activity conducted or funded by USDA.</p>
        <p>Persons with disabilities who require alternative means of communication for program information (e.g. Braille, large print, audiotape, American Sign Language, etc.), should contact the Agency (State or local) where they applied for benefits. Individuals who are deaf, hard of hearing or have speech disabilities may contact USDA through the Federal Relay Service at (800) 877-8339. Additionally, program information may be made available in languages other than English.</p>
        <p>To file a program complaint of discrimination, complete the USDA Program Discrimination Complaint Form, (AD-3027) found online at: How to File a Complaint, and at any USDA office, or write a letter addressed to USDA and provide in the letter all of the information requested in the form. To request a copy of the complaint form, call (866) 632-9992. Submit your completed form or letter to USDA by:</p>
        <ul style={{ margin: '5px 0' }}>
          <li><strong>mail:</strong> U.S. Department of Agriculture, Office of the Assistant Secretary for Civil Rights, 1400 Independence Avenue, SW, Washington, D.C. 20250-9410;</li>
          <li><strong>fax:</strong> (202) 690-7442; or</li>
          <li><strong>email:</strong> program.intake@usda.gov.</li>
        </ul>
        <p style={{ marginBottom: 0 }}>This institution is an equal opportunity provider.</p>
      </div>

      <h2>2024 Demographics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
        <img src="/src/assets/hopes1.png" alt="2024 Demographics Profile 1" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: 'var(--shadow)' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=hopes1.png' }} />
        <img src="/src/assets/hopes2.png" alt="2024 Demographics Profile 2" style={{ width: '100%', height: 'auto', borderRadius: '8px', boxShadow: 'var(--shadow)' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=hopes2.png' }} />
      </div>

      <h2>Annual Reports</h2>
      <div className="program-block">
        <h3>Hope’s Corner 2024 Annual Report</h3>
        <p>2024 was a momentous year for Hope’s Corner. For the first time ever, we surpassed serving 50,000 hot meals in one year. We have provided 266,748 hot meals cumulatively since the meal program began in 2011. In 2024, Hope’s Corner:</p>
        <ul>
          <li>Served <strong>50,189 hot meals</strong> to 1,209 unduplicated individuals (a 15% increase in program usage from the prior year).</li>
          <li>Washed <strong>850 loads of laundry</strong> for 174 unduplicated individuals (a 9% increase in program usage from the prior year).</li>
          <li>Provided <strong>2,902 warm showers</strong> to 350 unduplicated individuals (a 21% increase in program usage from the prior year).</li>
        </ul>
        <p>In addition to increasing our impact in all of our core service areas, we:</p>
        <ul>
          <li>Provided 140+ haircuts for guests thanks to a partnership with Seeds of Hope Silicon Valley.</li>
          <li>Repaired 400+ bicycles thanks to volunteer bicycle mechanics and Silicon Valley Bicycle Exchange.</li>
          <li>Supplied 600+ children with toys during our Children’s Holiday Event thanks to generous community members.</li>
        </ul>
        <p>We could not have provided so much support for our community members without the generous and compassionate help provided by the 989 volunteers donating an outstanding 12,538 hours of time in 2024. We are honored and humbled that so many people chose to give their time to our organization.</p>
        <a href="https://www.hopes-corner.org/s/Hopes-Corner-2024-Annual-Report.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)', fontWeight: 'bold' }}>The full report [PDF version] can be found here.</a>
      </div>

      <p style={{ margin: '15px 0 5px 0' }}><strong>2023 Annual Report</strong></p>
      <p style={{ marginTop: 0 }}><a href="https://www.hopes-corner.org/s/2023-Infographic-Final.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>A summary of our 2023 Annual Report can be found here.</a></p>

      <p style={{ margin: '15px 0 5px 0' }}><strong>2022 Annual Report</strong></p>
      <p style={{ marginTop: 0 }}><a href="https://www.hopes-corner.org/s/2022-Infographic-Final-yasd.pdf" target="_blank" rel="noreferrer" style={{ color: 'var(--hc-green-primary)' }}>A summary of our 2022 Annual Report can be found here.</a></p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', margin: '40px 0 20px 0' }}>
        <div>
          <h3 style={{ color: 'var(--hc-green-primary)', borderBottom: '2px solid var(--hc-border)', paddingBottom: '10px' }}>2026 Board Members</h3>
          <ul style={{ listStyleType: 'none', paddingLeft: 0, lineHeight: '1.8' }}>
            <li><strong>Leslie Carmichael</strong>, President</li>
            <li><strong>Alice Cota</strong>, Vice President</li>
            <li><strong>Judy Ho</strong>, Treasurer</li>
            <li><strong>Phil Marcoux</strong>, Secretary</li>
            <li>Dave Arnone, Member</li>
            <li>Leslie Berlin, Member</li>
            <li>Gwen Chong, Member</li>
            <li>Mike Hacker, Member</li>
            <li>Shari Kipp, Member</li>
            <li>Sudhir Pendse, Member</li>
            <li>Jana Powell, Member</li>
            <li>Claire Yang, Member</li>
            <li>Tom Myers, Member</li>
          </ul>
        </div>

        <div>
          <h3 style={{ color: 'var(--hc-green-primary)', borderBottom: '2px solid var(--hc-border)', paddingBottom: '10px' }}>Staff Members</h3>
          <ul style={{ listStyleType: 'none', paddingLeft: 0, lineHeight: '1.8' }}>
            <li><strong>Caleb A</strong>, Meal Program Assistant</li>
            <li><strong>Ariana B</strong>, Volunteer Coordinator</li>
            <li><strong>Araceli B</strong>, Senior Shower and Laundry Program Assistant</li>
            <li><strong>Miguel MC</strong>, Kitchen Manager</li>
            <li><strong>Isabelle F</strong>, Shower and Laundry Program Assistant</li>
            <li><strong>Maddy L</strong>, Corporate Engagement Program Manager</li>
            <li><strong>John R</strong>, Executive Director</li>
            <li><strong>Tori R</strong>, Donations and Bicycle Program Assistant</li>
            <li><strong>Priscilla V</strong>, Volunteer and Operations Manager</li>
          </ul>
        </div>
      </div>

      <h2>Hope's Corner's Collaborations</h2>
      <p>Hope’s Corner collaborates with other agencies and organizations in order to connect our guests with available services without attempting to duplicate services already being provided. These collaborations include:</p>
      <ul>
        <li><strong>Community Services Agency</strong> provides case managers on-site every Thursday during Hope’s Corner’s shower program hours so that guests can meet with a case manager when they are waiting for a shower.</li>
        <li><strong>UCSF Nurse Interns</strong> visit during Hope’s Corner’s Thursday shower program hours to check basic health conditions, such as blood pressure, blood sugar, heart rate, etc.</li>
        <li><strong>HomeFirst</strong> provides a Cold Weather Shelter during the winter at the site shared with Hope’s Corner. Hope’s Corner adjusted the timing of the setup for Saturday breakfast to accommodate the shelter, provides a volunteer every night to ensure that showers are available and helps to coordinate basic logistics between the uses.</li>
        <li><strong>Silicon Valley Bicycle Exchange</strong> provides bicycles upon request by the Hope’s Corner bicycle liaison so that our homeless guests who need bicycles can obtain them. Hope’s Corner purchases lights and locks through the Bicycle Exchange. The Silicon Valley Bicycle Exchange also provides children’s bicycles for the annual Hope’s Corner Children’s Party.</li>
        <li><strong>Walgreens and Stanford Hospital</strong> have provided free flu shot clinics during the Saturday breakfast once each year.</li>
        <li>Hope’s Corner collaborates with the <strong>Day Worker Center</strong> and <strong>CHAC Family Resource Center</strong> to host a Children’s Christmas Party each year to provide crafts for the kids and a place for parents to shop for holiday gifts.</li>
        <li><strong>Second Harvest Food Bank</strong> provides food, plus representatives come to Hope’s Corner occasionally to screen guests for CalFresh benefits.</li>
        <li><strong>Santa Clara County Health Department</strong> provides monthly healthy eating and fitness literature in multiple languages that Hope’s Corner prints and provides to guests.</li>
        <li><strong>Valley Homeless Healthcare Program</strong> operated by Santa Clara Valley Medical Center provides a mobile medical van in North County at the Community Service Agency and the Sunnyvale Winter Shelter. Hope’s Corner makes referrals to these two sites.</li>
        <li><strong>MayView Community Health Center</strong> provides medical care to Hope’s Corner clients regardless of ability to pay. In addition, a dental van comes to MayView Mountain View clinics to which guests can be referred.</li>
        <li><strong>El Camino Healthcare District</strong> has provided generous grants since 2015 that help Hope's Corner purchase fresh, healthy food.</li>
      </ul>

      <h2>Job Opportunities</h2>
      <p className="note-text">Thank you for your interest in working at Hope’s Corner. At this time, we do not currently have any paid opportunities available.</p>
    </div>
  )
}

export default AboutPage
