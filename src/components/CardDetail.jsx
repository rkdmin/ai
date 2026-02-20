import './CardDetail.css'

export default function CardDetail({ card, onBack }) {
  const isAvoid = card.type === 'avoid'

  return (
    <div className={`detail-page ${isAvoid ? 'avoid-page' : ''}`}>
      <button className="back-btn" onClick={onBack}>← 목록으로</button>

      {/* 히어로 */}
      <div className={`detail-hero ${isAvoid ? 'avoid-hero' : ''}`}>
        <span className="detail-emoji">{card.emoji}</span>
        <h1 className="detail-mood">{card.mood}</h1>
        {isAvoid && <p className="avoid-badge">피해야 할 스타일</p>}
      </div>

      {/* 헤어 */}
      <div className="detail-card">
        <p className="card-label">💇 헤어스타일</p>
        <p className="detail-value">{card.hair}</p>
        <p className="detail-reason">{card.hairReason}</p>
      </div>

      {/* 메이크업 */}
      <div className="detail-card">
        <p className="card-label">💄 메이크업</p>
        <div className="makeup-list">
          <div className="makeup-row">
            <span className="makeup-key">립</span>
            <span className="makeup-val">{card.makeup.lip}</span>
          </div>
          <div className="makeup-row">
            <span className="makeup-key">블러셔</span>
            <span className="makeup-val">{card.makeup.blush}</span>
          </div>
          <div className="makeup-row">
            <span className="makeup-key">아이섀도우</span>
            <span className="makeup-val">{card.makeup.eyeshadow}</span>
          </div>
        </div>
      </div>

      {/* 코치 멘트 */}
      <div className={`detail-card coach-card ${isAvoid ? 'avoid-coach' : ''}`}>
        <p className="card-label">{isAvoid ? '🚫 이유' : '✨ 코치 멘트'}</p>
        <p className="coach-text">{card.coachComment}</p>
      </div>

      {/* 적용 사진 (STEP 7 placeholder) */}
      {!isAvoid && (
        <div className="photo-placeholder">
          <p className="placeholder-icon">🖼</p>
          <p className="placeholder-text">내 얼굴에 적용된 사진</p>
          <p className="placeholder-sub">STEP 7에서 구현 예정</p>
        </div>
      )}
    </div>
  )
}
