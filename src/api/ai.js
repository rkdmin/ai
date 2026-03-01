/**
 * AI 프로바이더 라우터
 * VITE_MOCK=true       → 더미 데이터 반환 (토큰 소비 없음)
 * VITE_AI_PROVIDER=gemini → Gemini 사용
 * 기본                  → Claude 사용
 */
import * as claude from './claude'
import * as gemini from './gemini'
import * as mock from './mock'

function getProvider() {
  if (import.meta.env.VITE_MOCK === 'true') return mock
  return import.meta.env.VITE_AI_PROVIDER === 'gemini' ? gemini : claude
}

const provider = getProvider()

export const analyzeFace = (imageBase64, additionalImages) => provider.analyzeFace(imageBase64, additionalImages)
export const generateHairCards = (analysis) => provider.generateHairCards(analysis)
export const generateMakeupCards = (analysis) => provider.generateMakeupCards(analysis)
export const generateTotalCards = (analysis) => provider.generateTotalCards(analysis)
export const generateAllCards = (analysis) => provider.generateAllCards(analysis)
export const generateStyledPhoto = (imageBase64, card) =>
  import.meta.env.VITE_MOCK === 'true'
    ? mock.generateStyledPhoto(imageBase64, card)
    : gemini.generateStyledPhoto(imageBase64, card)
