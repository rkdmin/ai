import { useState } from 'react'
import './AnalysisResult.css'

const FACE_TYPE_LABEL = {
  계란형: { emoji: '🥚', desc: '이상적인 비율의 갸름한 얼굴형' },
  둥근형: { emoji: '🌕', desc: '부드럽고 귀여운 인상의 얼굴형' },
  사각형: { emoji: '⬛', desc: '강인하고 세련된 인상의 얼굴형' },
  하트형: { emoji: '🩷', desc: '화사하고 사랑스러운 얼굴형' },
  긴형:   { emoji: '🎭', desc: '지적이고 세련된 인상의 얼굴형' },
}

const PERSONAL_COLOR_STYLE = {
  봄웜: { bg: '#FFF4E6', color: '#D4820A', label: '봄 웜톤 🌸' },
  여름쿨: { bg: '#F0EEFF', color: '#7C5CBF', label: '여름 쿨톤 🌷' },
  가을웜: { bg: '#FFF0E8', color: '#B05A2A', label: '가을 웜톤 🍂' },
  겨울쿨: { bg: '#E8F0FF', color: '#2A4DB0', label: '겨울 쿨톤 ❄️' },
}

const COLOR_OPTIONS = ['봄웜', '여름쿨', '가을웜', '겨울쿨']

export default function AnalysisResult({ image, analysis, onReset, onNext }) {
  const [personalColor, setPersonalColor] = useState(analysis.personalColor)

  const faceInfo = FACE_TYPE_LABEL[analysis.faceType] ?? { emoji: '✨', desc: '' }
  const colorStyle = PERSONAL_COLOR_STYLE[personalColor] ?? PERSONAL_COLOR_STYLE['봄웜']
  const needsConfirm = analysis.colorConfidence !== 'high'

  return (
    <div className="result-page">
      <header className="result-header">
        <button className="back-btn" onClick={onReset}>← 다시 찍기</button>
        <h1 className="result-title">분석 완료 ✨</h1>
      </header>

      <img src={image} alt="분석된 사진" className="result-photo" />

      {/* 얼굴형 */}
      <div className="result-card">
        <p className="card-label">얼굴형</p>
        <div className="face-type-row">
          <span className="face-emoji">{faceInfo.emoji}</span>
          <div>
            <p className="face-name">{analysis.faceType}</p>
            <p className="face-desc">{faceInfo.desc}</p>
          </div>
        </div>
      </div>

      {/* 퍼스널컬러 */}
      <div className="result-card">
        <p className="card-label">퍼스널컬러</p>
        <div
          className="color-badge"
          style={{ background: colorStyle.bg, color: colorStyle.color }}
        >
          {colorStyle.label}
        </div>

        {needsConfirm && (
          <div className="color-confirm">
            <p className="confirm-notice">
              {analysis.colorConfidence === 'low'
                ? '사진 조건으로 퍼스널컬러를 정확히 분석하기 어려워요.'
                : '퍼스널컬러가 불확실해요.'}
              <br />직접 선택해주시면 더 정확해요.
            </p>
            <div className="color-options">
              {COLOR_OPTIONS.map((c) => {
                const s = PERSONAL_COLOR_STYLE[c]
                return (
                  <button
                    key={c}
                    className={`color-option ${personalColor === c ? 'selected' : ''}`}
                    style={personalColor === c ? { background: s.bg, color: s.color, borderColor: s.color } : {}}
                    onClick={() => setPersonalColor(c)}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 이목구비 특징 */}
      {analysis.features?.length > 0 && (
        <div className="result-card">
          <p className="card-label">이목구비 특징</p>
          <div className="feature-tags">
            {analysis.features.map((f, i) => (
              <span key={i} className="feature-tag">{f}</span>
            ))}
          </div>
        </div>
      )}

      <button className="next-btn" onClick={() => onNext(personalColor)}>
        코디 카드 받기 →
      </button>
    </div>
  )
}
