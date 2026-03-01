import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'
import AnalysisResult from './components/AnalysisResult'
import CardList from './components/CardList'
import CardDetail from './components/CardDetail'
import { analyzeFace, generateHairCards, generateMakeupCards, generateTotalCards } from './api/ai'
import './App.css'

export default function App() {
  const [step, setStep] = useState('upload') // upload | analyzing | result | generatingCards | cards | cardDetail
  const [image, setImage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [cardSets, setCardSets] = useState(null) // { hair: [], makeup: [], total: [] }
  const [selectedCard, setSelectedCard] = useState(null)
  const [error, setError] = useState(null)
  const [knowsPersonalColor, setKnowsPersonalColor] = useState(null)

  const handleAnalyze = async (imageBase64, additionalImages, knowsColor) => {
    setImage(imageBase64)
    setKnowsPersonalColor(knowsColor)
    setError(null)
    setStep('analyzing')
    try {
      const result = await analyzeFace(imageBase64, additionalImages)
      setAnalysis(result)
      setStep('result')
    } catch (err) {
      setError(err.message)
      setStep('upload')
    }
  }

  const handleGenerateCards = async (confirmedColor, cardType) => {
    const finalAnalysis = { ...analysis, personalColor: confirmedColor }
    setAnalysis(finalAnalysis)
    setError(null)
    setStep('generatingCards')
    try {
      const generators = { hair: generateHairCards, makeup: generateMakeupCards, total: generateTotalCards }
      const result = await generators[cardType](finalAnalysis)
      setCardSets({ [cardType]: result })
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
    setCardSets(null)
    setSelectedCard(null)
    setError(null)
    setKnowsPersonalColor(null)
  }

  // 로딩 화면
  if (step === 'analyzing' || step === 'generatingCards') {
    const isCards = step === 'generatingCards'
    return (
      <div className="loading-screen">
        <p className="loading-emblem">Beauté AI</p>
        <div className="loading-bars">
          <span/><span/><span/><span/><span/>
        </div>
        <div className="loading-divider" />
        <p className="loading-title">{isCards ? '코디 카드를 만들고 있어요' : '얼굴을 분석하고 있어요'}</p>
        <p className="loading-sub">잠시만 기다려주세요...</p>
      </div>
    )
  }

  if (step === 'cardDetail' && selectedCard) {
    return (
      <CardDetail
        card={selectedCard}
        image={image}
        onBack={() => setStep('cards')}
      />
    )
  }

  if (step === 'cards' && cardSets) {
    return (
      <CardList
        cardSets={cardSets}
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
          knowsPersonalColor={knowsPersonalColor}
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
