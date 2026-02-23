import { useState } from 'react'
import { generateStyledPhoto } from '../api/ai'
import './CardDetail.css'

const MAKEUP_ITEMS = [
  { key: 'lip',         label: 'Lip',   color: '#A88890', reasonKey: 'lipReason' },
  { key: 'blush',       label: 'Blush', color: '#B098A0', reasonKey: 'blushReason' },
  { key: 'eyeshadow',   label: 'Eye',   color: '#8898A8', reasonKey: 'eyeshadowReason' },
  { key: 'eyebrow',     label: 'Brow',  color: '#9A8878', reasonKey: 'eyebrowReason' },
  { key: 'eyeliner',    label: 'Liner', color: '#787890', reasonKey: 'eyelinerReason' },
  { key: 'highlighter', label: 'Glow',  color: '#A8A082', reasonKey: 'highlighterReason' },
]

export default function CardDetail({ card, image, onBack }) {
  const isAvoid = card.type === 'avoid'
  const [styledPhoto, setStyledPhoto] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setGenError(null)
    try {
      const result = await generateStyledPhoto(image, card)
      setStyledPhoto(result)
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className={`detail-page ${isAvoid ? 'avoid-page' : ''}`}>
      <button className="back-btn" onClick={onBack}>← 목록으로</button>

      {/* Hero */}
      <div className={`detail-hero ${isAvoid ? 'avoid-hero' : ''}`}>
        <div className="hero-top">
          <span className="detail-emoji">{card.emoji}</span>
          {isAvoid
            ? <span className="avoid-badge">Avoid</span>
            : card.rank && (
              <span className={`rank-badge-hero rank-${card.rank}`}>
                {card.rank === 1 ? 'Best Pick' : `${card.rank}nd Pick`}
              </span>
            )
          }
        </div>
        <h1 className="detail-mood">{card.mood}</h1>
      </div>

      <div className="detail-body">

        {/* ── 헤어 ─────────────────────────────── */}
        {card.hair && (
          <section className={`ds ds-hair ${isAvoid ? 'ds-hair--avoid' : ''}`}>
            <span className="ds-eyebrow">Hair Style</span>
            <p className="ds-title">{card.hair}</p>
            <p className="ds-desc">{card.hairReason}</p>
          </section>
        )}

        {/* ── 메이크업 ──────────────────────────── */}
        {card.makeup && (
          <section className="ds ds-makeup">
            <span className="ds-eyebrow">Makeup</span>
            <ul className="mup-list">
              {MAKEUP_ITEMS.map(({ key, label, color, reasonKey }) => {
                const val = card.makeup[key]
                if (!val) return null
                return (
                  <li key={key} className="mup-row">
                    <div className="mup-top">
                      <span className="mup-badge" style={{ background: color }}>{label}</span>
                      <span className="mup-name">{val}</span>
                    </div>
                    {card.makeup[reasonKey] && (
                      <p className="mup-why">{card.makeup[reasonKey]}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* ── 이목구비 팁 ───────────────────────── */}
        {card.featureTip && (
          <section className="ds ds-tip">
            <span className="ds-eyebrow">Feature Tip</span>
            <p className="ds-tip-text">{card.featureTip}</p>
          </section>
        )}

        {/* ── 코치 멘트 ─────────────────────────── */}
        <section className={`ds ds-coach ${isAvoid ? 'ds-coach--avoid' : ''}`}>
          <span className="ds-eyebrow">{isAvoid ? 'Why Avoid' : 'Coach Note'}</span>
          <p className="ds-coach-text">{card.coachComment}</p>
        </section>

      </div>

      {/* ── 적용 사진 ─────────────────────────── */}
      {!isAvoid && (
        <div className="photo-section">
          <span className="ds-eyebrow">내 얼굴에 적용해보기</span>

          {styledPhoto ? (
            <img src={styledPhoto} alt="스타일 적용 사진" className="styled-photo" />
          ) : (
            <div className="photo-placeholder">
              {generating ? (
                <>
                  <div className="gen-spinner" />
                  <p className="placeholder-text">사진을 생성하고 있어요...</p>
                  <p className="placeholder-sub">Gemini AI가 스타일을 적용 중이에요</p>
                </>
              ) : (
                <>
                  <p className="placeholder-icon">✨</p>
                  <p className="placeholder-text">이 스타일을 내 얼굴에 적용해볼까요?</p>
                  <button className="gen-btn" onClick={handleGenerate}>사진 생성하기</button>
                </>
              )}
            </div>
          )}

          {genError && <p className="gen-error">{genError}</p>}

          {styledPhoto && (
            <button className="regen-btn" onClick={handleGenerate} disabled={generating}>
              {generating ? '생성 중...' : '다시 생성하기'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
