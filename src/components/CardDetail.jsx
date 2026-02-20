import { useState } from 'react'
import { generateStyledPhoto } from '../api/gemini'
import './CardDetail.css'

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

      {/* 적용 사진 (추천 카드만) */}
      {!isAvoid && (
        <div className="photo-section">
          <p className="card-label" style={{ marginBottom: 12 }}>🖼 내 얼굴에 적용해보기</p>

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
                  <p className="placeholder-text">내 얼굴에 이 스타일을 적용해볼까요?</p>
                  <button className="gen-btn" onClick={handleGenerate}>
                    사진 생성하기
                  </button>
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
