function BadgesRow() {
  return (
    <section className="badges-section">
      <img
        src={new URL('../../assets/Four-Star+Rating+Badge+-+Full+Color.png', import.meta.url).href}
        alt="Four Star Rating Badge"
        className="badge-img"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Four+Star+Badge' }}
      />
      <img
        src={new URL('../../assets/image_826ea5.png', import.meta.url).href}
        alt="Guidestar Platinum Transparency Badge"
        className="badge-img"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Guidestar+Badge' }}
      />
      <img
        src={new URL('../../assets/2024-top-rated-awards-badge-hi-res.png', import.meta.url).href}
        alt="2024 Top Rated Awards Badge"
        className="badge-img"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=2024+Top+Rated' }}
      />
    </section>
  )
}

export default BadgesRow
