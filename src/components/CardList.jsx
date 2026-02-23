import './CardList.css'

const SECTIONS = [
  { key: 'hair', thin: 'Hair', bold: 'Style', sub: '헤어 추천 스타일 3가지', avoidSub: '피해야 할 헤어 스타일' },
  { key: 'makeup', thin: 'Makeup', bold: 'Look', sub: '메이크업 추천 룩 3가지', avoidSub: '피해야 할 메이크업 룩' },
  { key: 'total', thin: 'Total', bold: 'Style', sub: '종합 추천 스타일 3가지', avoidSub: '피해야 할 종합 스타일' },
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
        <div>
          <h1 className="list-title">Your Style Cards</h1>
          <p className="list-sub">
            {analysis.faceType}{analysis.personalColor ? ` · ${analysis.personalColor}` : ''}
          </p>
        </div>
      </header>

      {SECTIONS.map(({ key, thin, bold, sub, avoidSub }) => {
        const cards = cardSets[key] ?? []
        if (cards.length === 0) return null
        const recommend = cards.filter(c => c.type === 'recommend')
        const avoid = cards.find(c => c.type === 'avoid')

        return (
          <section key={key} className="card-section">
            <div className="section-heading">
              <span className="section-heading-thin">{thin}</span>
              <span className="section-heading-bold">{bold}</span>
            </div>
            <p className="section-sub">{sub}</p>

            <div className="card-grid">
              {recommend.map((card, i) => {
                const rank = card.rank ?? (i + 1)
                return (
                  <button key={i} className="card-item recommend" onClick={() => onSelectCard(card)}>
                    <span className="ghost-number">{String(rank).padStart(2, '0')}</span>
                    <div className="card-content">
                      <span className={`rank-badge rank-${rank}`}>
                        {rank === 1 ? 'Best' : rank === 2 ? '2nd' : '3rd'}
                      </span>
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
                <div className="section-label--avoid">
                  <span className="avoid-label-text">Avoid</span>
                  <div className="avoid-label-line" />
                </div>
                <button className="card-item avoid" onClick={() => onSelectCard(avoid)}>
                  <span className="ghost-number">✕</span>
                  <div className="card-content">
                    <span className="rank-badge">Worst</span>
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
