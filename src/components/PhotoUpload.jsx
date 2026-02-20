import { useState, useRef } from 'react'
import './PhotoUpload.css'

export default function PhotoUpload({ onAnalyze }) {
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="upload-page">
      <header className="upload-header">
        <div className="logo">💄</div>
        <h1 className="title">AI 뷰티 코치</h1>
        <p className="subtitle">사진 한 장으로 나만의 스타일 찾기</p>
      </header>

      <div className="upload-card">
        {preview ? (
          <div className="preview-wrap">
            <img src={preview} alt="업로드된 사진" className="preview-img" />
            <button
              className="change-btn"
              onClick={() => { setPreview(null); inputRef.current.value = '' }}
            >
              다른 사진 선택하기
            </button>
          </div>
        ) : (
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onClick={() => inputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
          >
            <div className="upload-icon">📷</div>
            <p className="upload-title">사진을 업로드하세요</p>
            <p className="upload-desc">클릭하거나 사진을 드래그하세요</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <div className="tips">
          <span className="tip">✓ 정면 사진</span>
          <span className="tip">✓ 자연광</span>
          <span className="tip">✓ 민낯 권장</span>
        </div>

        <button
          className="analyze-btn"
          disabled={!preview}
          onClick={() => onAnalyze(preview)}
        >
          분석 시작하기
        </button>
      </div>
    </div>
  )
}
