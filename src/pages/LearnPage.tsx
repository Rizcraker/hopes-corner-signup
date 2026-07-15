function LearnPage() {
  return (
    <div className="tab-fade-in content-page-layout">
      <h2>Our Programs & Services</h2>

      <section className="program-block">
        <h3>Meal Program</h3>
        <p>Our meal program is relied upon by unhoused, low-income, and vulnerable adults, seniors, and children from Mountain View and surrounding communities who are hungry. All welcome – no one is turned away!</p>
        <p>Hope’s Corner serves hot, nutritious meals every Monday, Wednesday and Saturday on site. In addition to providing hot meals, we always provide guests with a substantial lunch bag that includes items like beef jerky, sandwiches, fruit, granola bars, etc. This program offer a reliable source of substantial, balanced, and nutritious meals that improves the health of our meal guests.</p>
        <div className="hours-box">
          <h4>Hours of Operation for on-site meal program:</h4>
          <ul>
            <li><strong>Monday and Wednesday:</strong> 8:00am - 9:00am (to-go style)</li>
            <li><strong>Saturdays:</strong> 8:00am - 9:00am (seated service)</li>
          </ul>
        </div>
        <p>In addition to serving meals every Monday, Wednesday, and Saturday on site, we also provide:</p>
        <ul>
          <li>Hot meals to neighbors living in vehicles every Monday, Wednesday, Thursday, and Saturday.</li>
          <li>A light breakfast on Friday mornings (consisting of a bagel, breakfast sandwich, or pastry).</li>
        </ul>
      </section>

      <section className="program-block">
        <h3>Shower & Laundry Program</h3>
        <p>Hope’s Corner provides showers and laundry services to unhoused guests every Monday, Wednesday and Saturday. Guests sign up for a shower or laundry slot during our meal service and are offered on a first-come, first serve basis.</p>
        <div className="hours-box">
          <h4>Hours of Operation:</h4>
          <ul>
            <li><strong>Mondays and Wednesdays:</strong> 8:30am - 12:00pm</li>
            <li><strong>Saturdays:</strong> 8:30am - 2:00pm</li>
          </ul>
        </div>
      </section>

      <section className="program-block">
        <h3>Bicycle Program</h3>
        <p>Hope’s Corner repairs guest bicycles and provides refurbished bikes to guests when available. This program operates on Saturday mornings and is on a first-come, first-serve basis based on the complexity of repairs and volunteer availability.</p>
        <div className="hours-box">
          <h4>Hours of Operation:</h4>
          <ul>
            <li><strong>Saturdays:</strong> 8:00am - 11:00am*</li>
          </ul>
        </div>
        <p className="note-text"><em>*Note: the Bicycle Program typically repairs between 10-15 bikes every Saturday. Although we have volunteers on site repairing bikes until 11:00am, it does not mean that we will repair bicycles brought to the program up until 11am. Our suggestion is that guests bring their bike before 9:30am so we can guarantee it will be repaired.</em></p>
      </section>

      <section className="program-block">
        <h3>Holiday Program</h3>
        <p>Every December, Hope’s Corner invites local community members to our site to participate in our Holiday Program. Parents and guardians must register their children prior to the Holiday Program (information will be posted on our website). We typically serve the parents and guardians of about 600 children during this popular event!</p>
      </section>
    </div>
  )
}

export default LearnPage
