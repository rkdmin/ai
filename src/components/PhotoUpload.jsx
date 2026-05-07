import { useState, useRef } from 'react'
import { validateImage } from '../utils/validateImage'
import guideImageFront from '../data/촬영가이드 여자.png'
import './PhotoUpload.css'

const MIN_FILE_SIZE = 10 * 1024

const GUIDE_ITEMS = [
  {
    label: '공통 조건',
    items: [
      { text: '민무늬 검정 민소매 (어깨·쇄골 노출)', important: true },
      { text: '밝은 단색 배경 — 살구색·유채색 제외' },
      { text: '배경에 그림자 없음 / 조명은 얼굴 앞쪽' },
      { text: '후면 기본 카메라 (광각·초광각 금지)', important: true },
      { text: '갤럭시 울트라 기종 사용 금지' },
      { text: '카메라 수직 / 거리 약 60cm (팔 길이)' },
    ],
  },
  {
    label: '정면 자세',
    items: [
      { text: '앞머리까지 모두 올려 포니테일', important: true },
      { text: '렌즈 높이: 눈과 입술 사이' },
      { text: '차렷 자세 / 무표정' },
      { text: '어깨 양옆 여백 나오게' },
    ],
  },
]

async function processFile(file) {
  if (!file || !file.type.startsWith('image/')) return null
  if (file.size < MIN_FILE_SIZE) return { error: '파일이 너무 작아요. 실제 사진을 올려주세요.' }
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result
      const v = await validateImage(base64)
      resolve(v.valid ? { base64 } : { error: v.reason })
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoUpload({ onAnalyze }) {
  const [preview,    setPreview]    = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [knowsColor, setKnowsColor] = useState(null)
  const [mainError,  setMainError]  = useState(null)
  const [showGuide,  setShowGuide]  = useState(false)
  const [zoomedImage,setZoomedImage]= useState(null)

  const mainInputRef  = useRef(null)

  const handleMainFile = async (file) => {
    setMainError(null)
    const r = await processFile(file)
    if (!r) return
    if (r.error) { setMainError(r.error); return }
    setPreview(r.base64)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    handleMainFile(e.dataTransfer.files[0])
  }

  const handleReset = () => {
    setPreview(null); setMainError(null)
    mainInputRef.current.value = ''
  }

  return (
    <div className="upload-page">
      <div className="upload-top-bar">
        <span className="upload-top-bar-logo">Beauté AI</span>
        <span className="upload-top-bar-right">Beauty Coach</span>
      </div>
      <header className="upload-header">
        <span className="header-overline">AI Beauty Coach</span>
        <div className="hero-headline">
          <span className="hero-line-thin">Find your</span>
          <span className="hero-line-bold">most beautiful</span>
          <span className="hero-line-thin">self.</span>
        </div>
        <p className="subtitle">사진 한 장으로 얼굴형과 퍼스널컬러를 분석하고,<br />나만의 코디 카드를 받아보세요.</p>
        <div className="header-divider" />
      </header>

      <div className="upload-card">

        {/* ── 정면 사진 ── */}
        <div className="photo-section">
          <div className="photo-section-header">
            <span className="photo-section-label">정면 사진</span>
            <span className="photo-badge photo-badge--required">필수</span>
          </div>
          {preview ? (
            <div className="preview-wrap">
              <img src={preview} alt="정면 사진" className="preview-img" />
              <button className="change-btn" onClick={handleReset}>다른 사진 선택하기</button>
            </div>
          ) : (
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''} ${mainError ? 'error' : ''}`}
              onClick={() => mainInputRef.current.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
            >
              <div className="upload-icon">{mainError ? '⚠️' : '+'}</div>
              <p className="upload-title">
                {mainError ? '사진을 다시 선택해주세요' : '정면 사진을 올려주세요'}
              </p>
              <p className={`upload-desc ${mainError ? 'upload-error-msg' : ''}`}>
                {mainError ?? '탭 또는 드래그'}
              </p>
            </div>
          )}
        </div>
        <input ref={mainInputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => handleMainFile(e.target.files[0])} />

        {/* ── 팁 & 가이드 ── */}
        <div className="tips-row">
          <div className="tips">
            <span className="tip tip--key">검정 민소매</span>
            <span className="tip tip--key">기본 카메라</span>
            <span className="tip tip--key">포니테일 필수</span>
          </div>
        </div>
        <button className="guide-btn" onClick={() => setShowGuide(true)}>
          촬영가이드 확인하기
        </button>

        <div className="color-divider" />

        {/* ── 퍼스널컬러 ── */}
        <div className="color-question">
          <p className="color-question-label">퍼스널컬러를 알고 계신가요?</p>
          <div className="color-question-btns">
            <button className={`color-q-btn ${knowsColor === true  ? 'selected' : ''}`} onClick={() => setKnowsColor(true)}>알아요</button>
            <button className={`color-q-btn ${knowsColor === false ? 'selected' : ''}`} onClick={() => setKnowsColor(false)}>몰라요</button>
          </div>
        </div>

        <button
          className="analyze-btn"
          disabled={!preview || knowsColor === null}
          onClick={() => onAnalyze(preview, knowsColor)}
        >
          분석 시작하기
        </button>
      </div>

      {/* ── 확대 오버레이 ── */}
      {zoomedImage && (
        <div className="guide-img-zoom" onMouseUp={() => setZoomedImage(null)} onTouchEnd={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="촬영 예시 확대" className="guide-img-zoom-img" />
        </div>
      )}

      {/* ── 촬영 가이드 시트 ── */}
      {showGuide && (
        <div className="guide-sheet" onClick={() => setShowGuide(false)}>
          <div className="guide-inner" onClick={(e) => e.stopPropagation()}>
            <div className="guide-header">
              <p className="guide-title">촬영 가이드</p>
              <button className="guide-close" onClick={() => setShowGuide(false)}>✕</button>
            </div>

            <div className="guide-img-section">
              <div className="guide-img-frame">
                <img
                  src={guideImageFront}
                  alt="정면 촬영 예시"
                  className="guide-illustration"
                  onMouseDown={() => setZoomedImage(guideImageFront)}
                  onTouchStart={() => setZoomedImage(guideImageFront)}
                  onMouseLeave={() => setZoomedImage(null)}
                />
                <p className="guide-img-hint">꾹 눌러서 확대</p>
              </div>
            </div>

            <div className="guide-list">
              {GUIDE_ITEMS.map(({ label, items }) => (
                <div key={label} className="guide-section">
                  <p className="guide-section-label">{label}</p>
                  {items.map((item, i) => (
                    <p key={i} className={`guide-section-item ${item.important ? 'guide-section-item--key' : ''}`}>
                      — {item.text}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
