import './CardList.css'

export default function CardList({ cards, analysis, onSelectCard, onReset }) {
  const recommend = cards.filter(c => c.type === 'recommend')
  const avoid = cards.find(c => c.type === 'avoid')

  return (
    <div className="card-list-page">
      <header className="list-header">
        <button className="back-btn" onClick={onReset}>← 처음으로</button>
        <div className="header-text">
          <h1 className="list-title">나만의 코디 카드</h1>
          <p className="list-sub">{analysis.faceType}{analysis.personalColor ? ` · ${analysis.personalColor}` : ''}</p>
        </div>
      </header>

      <section>
        <p className="section-label">✨ 추천 스타일</p>
        <div className="card-grid">
          {recommend.map((card, i) => {
            const rank = card.rank ?? (i + 1)
            return (
              <button key={i} className="card-item recommend" onClick={() => onSelectCard(card)}>
                <span className={`rank-badge rank-${rank}`}>{rank}위</span>
                <span className="card-emoji">{card.emoji}</span>
                <div className="card-info">
                  <p className="card-mood">{card.mood}</p>
                  <p className="card-preview">{card.hair} · {card.makeup.lip}</p>
                </div>
                <span className="card-arrow">›</span>
              </button>
            )
          })}
        </div>
      </section>

      {avoid && (
        <section>
          <p className="section-label">🚫 피해야 할 스타일</p>
          <button className="card-item avoid" onClick={() => onSelectCard(avoid)}>
            <span className="card-emoji">{avoid.emoji}</span>
            <div className="card-info">
              <p className="card-mood">{avoid.mood}</p>
              <p className="card-preview">{avoid.hair} · {avoid.makeup.lip}</p>
            </div>
            <span className="card-arrow">›</span>
          </button>
        </section>
      )}
    </div>
  )
}
