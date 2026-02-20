import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'
import AnalysisResult from './components/AnalysisResult'
import { analyzeFace } from './api/claude'
import './App.css'

export default function App() {
  const [step, setStep] = useState('upload') // 'upload' | 'analyzing' | 'result'
  const [image, setImage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async (imageBase64) => {
    setImage(imageBase64)
    setError(null)
    setStep('analyzing')
    try {
      const result = await analyzeFace(imageBase64)
      setAnalysis(result)
      setStep('result')
    } catch (err) {
      setError(err.message)
      setStep('upload')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setImage(null)
    setAnalysis(null)
    setError(null)
  }

  const handleNext = (confirmedColor) => {
    // TODO STEP 6: 코디 카드 생성
    console.log('다음 단계:', confirmedColor)
  }

  if (step === 'analyzing') {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-title">얼굴을 분석하고 있어요</p>
        <p className="loading-sub">잠시만 기다려주세요...</p>
      </div>
    )
  }

  if (step === 'result' && analysis) {
    return (
      <AnalysisResult
        image={image}
        analysis={analysis}
        onReset={handleReset}
        onNext={handleNext}
      />
    )
  }

  return (
    <>
      <PhotoUpload onAnalyze={handleAnalyze} />
      {error && <p className="error-toast">{error}</p>}
    </>
  )
}
