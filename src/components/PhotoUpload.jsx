import { useState, useRef } from 'react'
import { validateImage } from '../utils/validateImage'
import guideImage from '../data/촬영가이드 여자.png'
import sideGuideImage from '../data/촬영가이드 측면.png'
import './PhotoUpload.css'

const MIN_FILE_SIZE = 10 * 1024

const GUIDE_TABS = ['공통사항', '촬영각도', '주의사항']

const COMMON_SECTIONS = [
  {
    label: '의상',
    items: [
      { text: '민무늬 검정 민소매 착용 (어깨·쇄골이 보여야 함)', key: true },
      { text: '패턴·로고·색상 있는 옷 X' },
    ],
  },
  {
    label: '헤어',
    items: [
      { text: '앞머리까지 완전히 올려서 포니테일로 묶기', key: true },
    ],
  },
  {
    label: '배경 & 조명',
    items: [
      { text: '민무늬 밝은 배경 (살구색 제외)' },
      { text: '배경에 그림자가 지지 않도록 주의' },
      { text: '조명은 앞쪽에 배치 (역광 X)' },
    ],
  },
  {
    label: '카메라',
    items: [
      { text: '후면 카메라 / 기본 모드 사용', key: true },
      { text: '광각(0.5×) 금지 — 얼굴 왜곡 발생', key: true },
      { text: '갤럭시 울트라 기종 사용 금지' },
      { text: '카메라를 기울이지 말고 수직 유지' },
    ],
  },
  {
    label: '거리 & 프레임',
    items: [
      { text: '거리: 약 60cm (팔 길이)' },
      { text: '렌즈 위치: 눈과 입술 사이' },
      { text: '프레임: 어깨 양옆에 여백 나오게' },
      { text: '자세: 차렷 / 무표정' },
    ],
  },
]

const ANGLE_CARDS = [
  {
    label: '정면',
    badge: '필수',
    type: 'required',
    imageKey: 'front',
    desc: null,
    items: [
      '카메라를 정면으로 바라보기',
      '고개를 앞뒤로 기울이지 말 것',
    ],
  },
  {
    label: '측면 (90도)',
    badge: '권장',
    type: 'recommended',
    imageKey: 'side',
    desc: '돌출입·무턱·주걱턱·하관 각도처럼 정면에서 보기 어려운 특징 파악에 도움이 됩니다.',
    items: [
      '고개를 왼쪽 또는 오른쪽으로 완전히 돌리기 (90도)',
      '귀·콧등·턱 라인이 전부 보여야 함',
      '시선도 측면 방향 유지 (정면 X)',
    ],
  },
  {
    label: '45도 반측면',
    badge: '권장',
    type: 'recommended',
    imageKey: 'side',
    desc: '광대 돌출 여부 및 땅콩형 판단 정확도를 높이는 데 도움이 됩니다.',
    items: [
      '고개를 한쪽으로 45도 돌리기',
      '코끝이 볼 라인 바깥으로 나오지 않는 각도 유지',
    ],
  },
]

const MISTAKE_LIST = [
  '앞머리를 내린 채 촬영 → 이마·얼굴형 분석 불가',
  '광각 카메라 사용 → 얼굴 비율 왜곡',
  '측면 촬영 시 시선만 정면 → 목·하관 라인 왜곡',
  '마스크·선글라스 착용 → 이목구비 분석 불가',
  '어두운 배경 또는 역광 → 윤곽 인식 오류',
]

const CHECKLIST = [
  { text: '검정 민소매 착용', required: true },
  { text: '앞머리까지 포니테일로 올려 묶음', required: true },
  { text: '밝은 민무늬 배경', required: true },
  { text: '후면 기본 카메라 (광각 X)', required: true },
  { text: '카메라 수직 / 거리 60cm', required: true },
  { text: '정면 사진 — 무표정 / 차렷 / 어깨 여백', required: true },
  { text: '측면(90도) 사진 — 귀·코·턱 라인 전부 보임', required: false },
  { text: '45도 반측면 사진 — 광대·볼 라인 확인', required: false },
]

export default function PhotoUpload({ onAnalyze }) {
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [knowsColor, setKnowsColor] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [zoomedGuide, setZoomedGuide] = useState(null)
  const inputRef = useRef(null)

  const getAngleImage = (imageKey) => imageKey === 'front' ? guideImage : sideGuideImage

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
        <button className="guide-btn" onClick={() => { setShowGuide(true); setActiveTab(0) }}>
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
          <img
            src={zoomedGuide === 'front' ? guideImage : sideGuideImage}
            alt="촬영 예시 확대"
            className="guide-img-zoom-img"
          />
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

            {/* 탭 네비게이션 */}
            <div className="guide-tabs">
              {GUIDE_TABS.map((tab, i) => (
                <button
                  key={tab}
                  className={`guide-tab ${activeTab === i ? 'guide-tab--active' : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="guide-body">

              {/* 탭 0: 공통사항 */}
              {activeTab === 0 && (
                <div className="guide-common">
                  <p className="guide-hint">모든 사진에 동일하게 적용되는 기본 사항입니다.</p>
                  {COMMON_SECTIONS.map(({ label, items }) => (
                    <div key={label} className="guide-section">
                      <p className="guide-section-label">{label}</p>
                      {items.map((item, i) => (
                        <p key={i} className={`guide-section-item ${item.key ? 'guide-section-item--key' : ''}`}>
                          — {item.text}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* 탭 1: 촬영각도 */}
              {activeTab === 1 && (
                <div className="guide-angles">
                  <p className="guide-hint">다양한 각도의 사진을 촬영하면 분석 정확도가 높아집니다.</p>
                  {ANGLE_CARDS.map((card) => (
                    <div key={card.label} className="angle-card">
                      <div className="angle-card-header">
                        <span className={`angle-badge angle-badge--${card.type}`}>{card.badge}</span>
                        <span className="angle-card-title">{card.label}</span>
                      </div>
                      <div className="angle-card-body">
                        <img
                          src={getAngleImage(card.imageKey)}
                          alt={`${card.label} 예시`}
                          className="angle-card-img"
                          onTouchStart={() => setZoomedGuide(card.imageKey)}
                          onTouchEnd={() => setZoomedGuide(null)}
                          onMouseDown={() => setZoomedGuide(card.imageKey)}
                          onMouseUp={() => setZoomedGuide(null)}
                          onMouseLeave={() => setZoomedGuide(null)}
                        />
                        <div className="angle-card-info">
                          {card.desc && <p className="angle-card-desc">{card.desc}</p>}
                          {card.items.map((item, i) => (
                            <p key={i} className="angle-card-item">— {item}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 탭 2: 주의사항 */}
              {activeTab === 2 && (
                <div className="guide-caution">
                  <div className="guide-section">
                    <p className="guide-section-label">자주 하는 실수</p>
                    {MISTAKE_LIST.map((item, i) => (
                      <p key={i} className="guide-mistake-item">— {item}</p>
                    ))}
                  </div>
                  <div className="guide-section">
                    <p className="guide-section-label">체크리스트</p>
                    {CHECKLIST.map((item, i) => (
                      <div key={i} className={`checklist-item ${!item.required ? 'checklist-item--optional' : ''}`}>
                        <span className="checklist-box">□</span>
                        <span className="checklist-text">{item.text}</span>
                        {!item.required && <span className="checklist-tag">권장</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
