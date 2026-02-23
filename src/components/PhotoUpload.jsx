import { useState, useRef } from 'react'
import { validateImage } from '../utils/validateImage'
import guideImage from '../data/촬영가이드 여자.png'
import './PhotoUpload.css'

const MIN_FILE_SIZE = 10 * 1024

const GUIDE_ITEMS = [
  {
    label: '의상',
    items: [
      { text: '어깨·쇄골이 보이는 민무늬 검정 민소매', important: true },
    ],
  },
  {
    label: '배경 & 조명',
    items: [
      { text: '민무늬 밝은 배경 (살구색 제외)' },
      { text: '배경에 그림자 X' },
      { text: '조명은 앞쪽에 배치' },
    ],
  },
  {
    label: '카메라',
    items: [
      { text: '후면 / 기본 (광각 금지)', important: true },
      { text: '갤럭시 울트라 기종 사용 금지' },
      { text: '카메라 수직 유지' },
    ],
  },
  {
    label: '촬영 자세',
    items: [
      { text: '앞머리까지 완전히 올려서 포니테일로 묶기', important: true },
      { text: '카메라 거리 약 60cm (팔 길이)' },
      { text: '렌즈 위치: 눈과 입술 사이' },
      { text: '차렷 자세 / 무표정' },
      { text: '어깨 양옆 여백 나오게' },
    ],
  },
]

export default function PhotoUpload({ onAnalyze }) {
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [knowsColor, setKnowsColor] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [zoomedGuide, setZoomedGuide] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setUploadError(null)
    if (file.size < MIN_FILE_SIZE) {
      setUploadError('파일이 너무 작아요. 실제 사진 파일을 올려주세요.')
      return
    }
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result
      const validation = await validateImage(base64)
      if (!validation.valid) { setUploadError(validation.reason); return }
      setPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleReset = () => {
    setPreview(null)
    setUploadError(null)
    inputRef.current.value = ''
  }

  return (
    <div className="upload-page">
      <header className="upload-header">
        <span className="header-overline">AI Beauty Coach</span>
        <div className="hero-headline">
          <span className="hero-line-thin">Find your</span>
          <span className="hero-line-bold">Beauty.</span>
        </div>
        <p className="subtitle">사진 한 장으로 나만의 스타일 찾기</p>
        <div className="header-divider" />
      </header>

      <div className="upload-card">
        {preview ? (
          <div className="preview-wrap">
            <img src={preview} alt="업로드된 사진" className="preview-img" />
            <button className="change-btn" onClick={handleReset}>다른 사진 선택하기</button>
          </div>
        ) : (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''} ${uploadError ? 'error' : ''}`}
            onClick={() => inputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="upload-icon">{uploadError ? '⚠️' : '📷'}</div>
            <p className="upload-title">
              {uploadError ? '사진을 다시 선택해주세요' : '사진을 업로드하세요'}
            </p>
            <p className={`upload-desc ${uploadError ? 'upload-error-msg' : ''}`}>
              {uploadError ?? '클릭하거나 사진을 드래그하세요'}
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

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

        <div className="color-question">
          <p className="color-question-label">퍼스널컬러를 알고 계신가요?</p>
          <div className="color-question-btns">
            <button
              className={`color-q-btn ${knowsColor === true ? 'selected' : ''}`}
              onClick={() => setKnowsColor(true)}
            >알아요</button>
            <button
              className={`color-q-btn ${knowsColor === false ? 'selected' : ''}`}
              onClick={() => setKnowsColor(false)}
            >몰라요</button>
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

      {/* 사진 확대 오버레이 */}
      {zoomedGuide && (
        <div className="guide-img-zoom" style={{ pointerEvents: 'none' }}>
          <img src={guideImage} alt="촬영 예시 확대" className="guide-img-zoom-img" />
        </div>
      )}

      {/* 촬영 가이드 시트 */}
      {showGuide && (
        <div className="guide-sheet" onClick={() => setShowGuide(false)}>
          <div className="guide-inner" onClick={(e) => e.stopPropagation()}>
            <div className="guide-header">
              <p className="guide-title">촬영 가이드</p>
              <button className="guide-close" onClick={() => setShowGuide(false)}>✕</button>
            </div>
            <div className="guide-body">
              <img
                src={guideImage}
                alt="촬영 예시"
                className="guide-illustration"
                onTouchStart={() => setZoomedGuide(true)}
                onTouchEnd={() => setZoomedGuide(false)}
                onMouseDown={() => setZoomedGuide(true)}
                onMouseUp={() => setZoomedGuide(false)}
                onMouseLeave={() => setZoomedGuide(false)}
              />
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
        </div>
      )}
    </div>
  )
}
