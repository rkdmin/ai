import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'
import AnalysisResult from './components/AnalysisResult'
import CardList from './components/CardList'
import CardDetail from './components/CardDetail'
import { analyzeFace, generateCards } from './api/claude'
import './App.css'

export default function App() {
  const [step, setStep] = useState('upload') // upload | analyzing | result | generatingCards | cards | cardDetail
  const [image, setImage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
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

  const handleGenerateCards = async (confirmedColor) => {
    const finalAnalysis = { ...analysis, personalColor: confirmedColor }
    setAnalysis(finalAnalysis)
    setError(null)
    setStep('generatingCards')
    try {
      const result = await generateCards(finalAnalysis)
      setCards(result)
      setStep('cards')
    } catch (err) {
      setError(err.message)
      setStep('result')
    }
  }

  const handleReset = () => {
    setStep('upload')
    setImage(null)
    setAnalysis(null)
    setCards([])
    setSelectedCard(null)
    setError(null)
  }

  // 로딩 화면
  if (step === 'analyzing' || step === 'generatingCards') {
    const isCards = step === 'generatingCards'
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-title">{isCards ? '코디 카드를 만들고 있어요' : '얼굴을 분석하고 있어요'}</p>
        <p className="loading-sub">잠시만 기다려주세요...</p>
      </div>
    )
  }

  if (step === 'cardDetail' && selectedCard) {
    return (
      <CardDetail
        card={selectedCard}
        onBack={() => setStep('cards')}
      />
    )
  }

  if (step === 'cards' && cards.length > 0) {
    return (
      <CardList
        cards={cards}
        analysis={analysis}
        onSelectCard={(card) => { setSelectedCard(card); setStep('cardDetail') }}
        onReset={handleReset}
      />
    )
  }

  if (step === 'result' && analysis) {
    return (
      <>
        <AnalysisResult
          image={image}
          analysis={analysis}
          onReset={handleReset}
          onNext={handleGenerateCards}
        />
        {error && <p className="error-toast">{error}</p>}
      </>
    )
  }

  return (
    <>
      <PhotoUpload onAnalyze={handleAnalyze} />
      {error && <p className="error-toast">{error}</p>}
    </>
  )
}
