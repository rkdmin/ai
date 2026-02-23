import { useState, useRef } from 'react'
import { validateImage } from '../utils/validateImage'
import './PhotoUpload.css'

const MIN_FILE_SIZE = 10 * 1024

export default function PhotoUpload({ onAnalyze }) {
  const [preview, setPreview] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [knowsColor, setKnowsColor] = useState(null)
  const [uploadError, setUploadError] = useState(null)
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

        <div className="tips">
          <span className="tip">정면 사진</span>
          <span className="tip">자연광</span>
          <span className="tip">민낯 권장</span>
        </div>

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
    </div>
  )
}
