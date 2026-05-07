/**
 * AI 프로바이더 라우터
 * VITE_MOCK=true → 더미 데이터 (토큰 소비 없음)
 * 그 외          → Gemini
 */
import * as gemini from './gemini'
import * as mock from './mock'

const provider = import.meta.env.VITE_MOCK === 'true' ? mock : gemini

export const analyzeFace = (imageBase64, faceRatios) =>
  provider.analyzeFace(imageBase64, faceRatios)
export const generateHairCards = (analysis) => provider.generateHairCards(analysis)
export const generateMakeupCards = (analysis) => provider.generateMakeupCards(analysis)
export const generateTotalCards = (analysis) => provider.generateTotalCards(analysis)
export const generateAllCards = (analysis) => provider.generateAllCards(analysis)
export const generateStyledPhoto = (imageBase64, card) => provider.generateStyledPhoto(imageBase64, card)
