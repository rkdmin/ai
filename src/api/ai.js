/**
 * AI 프로바이더 라우터
 * VITE_MOCK=true → 더미 데이터 (네트워크 호출 없음, 토큰 소비 없음)
 * 그 외          → 백엔드 (FastAPI) HTTP 클라이언트
 */
import * as backend from './backend'
import * as mock from './mock'

const provider = import.meta.env.VITE_MOCK === 'true' ? mock : backend

export const analyzeFace = (imageBase64) => provider.analyzeFace(imageBase64)
export const generateHairCards = (analysis) => provider.generateHairCards(analysis)
export const generateMakeupCards = (analysis) => provider.generateMakeupCards(analysis)
export const generateTotalCards = (analysis) => provider.generateTotalCards(analysis)
export const generateAllCards = (analysis) => provider.generateAllCards(analysis)
export const generateStyledPhoto = (imageBase64, card) => provider.generateStyledPhoto(imageBase64, card)
