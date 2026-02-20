import { useState } from 'react'
import PhotoUpload from './components/PhotoUpload'

export default function App() {
  const [image, setImage] = useState(null)

  const handleAnalyze = (imageBase64) => {
    setImage(imageBase64)
    // TODO STEP 4: Claude Vision API 호출
    console.log('분석 시작')
  }

  return <PhotoUpload onAnalyze={handleAnalyze} />
}
