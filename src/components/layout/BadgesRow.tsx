function BadgesRow() {
  return (
    <section className="badges-section" style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', padding: '20px' }}>
      <img
        src={new URL('../../assets/Four-Star+Rating+Badge+-+Full+Color.png', import.meta.url).href}
        alt="Four Star Rating Badge"
        style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Four+Star+Badge' }}
      />
      <img
        src={new URL('../../assets/image_826ea5.png', import.meta.url).href}
        alt="Guidestar Platinum Transparency Badge"
        style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=Guidestar+Badge' }}
      />
      <img
        src={new URL('../../assets/2024-top-rated-awards-badge-hi-res.png', import.meta.url).href}
        alt="2024 Top Rated Awards Badge"
        style={{ height: '110px', width: 'auto', objectFit: 'contain' }}
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x110?text=2024+Top+Rated' }}
      />
    </section>
  )
}

export default BadgesRow
