import './CardList.css'

const SECTIONS = [
  { key: 'hair',   label: '💇 헤어 추천',   avoidLabel: '🚫 피해야 할 헤어' },
  { key: 'makeup', label: '💄 메이크업 추천', avoidLabel: '🚫 피해야 할 메이크업' },
  { key: 'total',  label: '✨ 종합 추천',    avoidLabel: '🚫 피해야 할 스타일' },
]

function cardPreview(card) {
  if (card.cardType === 'hair') return card.hair
  if (card.cardType === 'makeup') return `${card.makeup?.lip} · ${card.makeup?.blush}`
  return `${card.hair} · ${card.makeup?.lip}`
}

export default function CardList({ cardSets, analysis, onSelectCard, onReset }) {
  return (
    <div className="card-list-page">
      <header className="list-header">
        <button className="back-btn" onClick={onReset}>← 처음으로</button>
        <div className="header-text">
          <h1 className="list-title">나만의 코디 카드</h1>
          <p className="list-sub">{analysis.faceType}{analysis.personalColor ? ` · ${analysis.personalColor}` : ''}</p>
        </div>
      </header>

      {SECTIONS.map(({ key, label, avoidLabel }) => {
        const cards = cardSets[key] ?? []
        if (cards.length === 0) return null
        const recommend = cards.filter(c => c.type === 'recommend')
        const avoid = cards.find(c => c.type === 'avoid')

        return (
          <section key={key} className="card-section">
            <p className={`section-label section-label--${key}`}>{label}</p>
            <div className="card-grid">
              {recommend.map((card, i) => {
                const rank = card.rank ?? (i + 1)
                return (
                  <button key={i} className="card-item recommend" onClick={() => onSelectCard(card)}>
                    <span className={`rank-badge rank-${rank}`}>{rank}위</span>
                    <span className="card-emoji">{card.emoji}</span>
                    <div className="card-info">
                      <p className="card-mood">{card.mood}</p>
                      <p className="card-preview">{cardPreview(card)}</p>
                    </div>
                    <span className="card-arrow">›</span>
                  </button>
                )
              })}
            </div>

            {avoid && (
              <>
                <p className="section-label section-label--avoid">{avoidLabel}</p>
                <button className="card-item avoid" onClick={() => onSelectCard(avoid)}>
                  <span className="card-emoji">{avoid.emoji}</span>
                  <div className="card-info">
                    <p className="card-mood">{avoid.mood}</p>
                    <p className="card-preview">{cardPreview(avoid)}</p>
                  </div>
                  <span className="card-arrow">›</span>
                </button>
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}
