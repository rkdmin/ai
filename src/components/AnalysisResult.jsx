import { useState } from 'react'
import './AnalysisResult.css'

const FACE_TYPE_LABEL = {
  계란형: { emoji: '🥚', desc: '이상적인 비율의 갸름한 얼굴형' },
  둥근형: { emoji: '🌕', desc: '부드럽고 귀여운 인상의 얼굴형' },
  사각형: { emoji: '⬛', desc: '강인하고 세련된 인상의 얼굴형' },
  하트형: { emoji: '🩷', desc: '화사하고 사랑스러운 얼굴형' },
  긴형: { emoji: '🎭', desc: '지적이고 세련된 인상의 얼굴형' },
  다이아몬드형: { emoji: '💎', desc: '광대가 발달한 입체적인 얼굴형' },
  땅콩형: { emoji: '🥜', desc: '광대와 하관이 모두 발달한 얼굴형' },
}

const PERSONAL_COLOR_STYLE = {
  봄웜: { label: '봄 웜톤 🌸' },
  여름쿨: { label: '여름 쿨톤 🌷' },
  가을웜: { label: '가을 웜톤 🍂' },
  겨울쿨: { label: '겨울 쿨톤 ❄️' },
}

const COLOR_OPTIONS = ['봄웜', '여름쿨', '가을웜', '겨울쿨']

export default function AnalysisResult({ image, analysis, knowsPersonalColor, onReset, onNext }) {
  const [personalColor, setPersonalColor] = useState(null)

  const faceInfo = FACE_TYPE_LABEL[analysis.faceType] ?? { emoji: '✨', desc: '' }
  const canProceed = !knowsPersonalColor || personalColor !== null

  const handleNext = (cardType) => {
    onNext(knowsPersonalColor ? personalColor : null, cardType)
  }

  return (
    <div className="result-page">
      <header className="result-header">
        <button className="back-btn" onClick={onReset}>← 다시 찍기</button>
        <p className="result-title">Your Profile</p>
      </header>

      <img src={image} alt="분석된 사진" className="result-photo" />

      <div className="result-body">
        {/* 얼굴형 */}
        <div className="result-card">
          <p className="card-label">Face Type</p>
          <div className="face-type-row">
            <span className="face-emoji">{faceInfo.emoji}</span>
            <div>
              <p className="face-name">{analysis.faceType}</p>
              <p className="face-desc">{faceInfo.desc}</p>
            </div>
          </div>
        </div>

        {/* 퍼스널컬러 */}
        {knowsPersonalColor && (
          <div className="result-card">
            <p className="card-label">Personal Color</p>
            <p className="confirm-notice">본인의 퍼스널컬러를 선택해주세요.</p>
            <div className="color-options">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  className={`color-option ${personalColor === c ? 'selected' : ''}`}
                  onClick={() => setPersonalColor(c)}
                >
                  {PERSONAL_COLOR_STYLE[c].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 이목구비 */}
        {analysis.features?.length > 0 && (
          <div className="result-card">
            <p className="card-label">Features</p>
            <div className="feature-tags">
              {analysis.features.map((f, i) => (
                <span key={i} className="feature-tag">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card-btn-group">
        <button className="card-btn card-btn--hair" disabled={!canProceed} onClick={() => handleNext('hair')}>
          💇 헤어 카드 받기
        </button>
        <button className="card-btn card-btn--makeup" disabled={!canProceed} onClick={() => handleNext('makeup')}>
          💄 메이크업 카드 받기
        </button>
        <button className="card-btn card-btn--total" disabled={!canProceed} onClick={() => handleNext('total')}>
          ✨ 종합 카드 받기
        </button>
      </div>
    </div>
  )
}
