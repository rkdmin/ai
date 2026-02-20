/**
 * AI 프로바이더 라우터
 * .env에서 VITE_AI_PROVIDER=claude (기본) 또는 VITE_AI_PROVIDER=gemini 로 전환
 */
import * as claude from './claude'
import * as gemini from './gemini'

const provider = import.meta.env.VITE_AI_PROVIDER === 'gemini' ? gemini : claude

export const analyzeFace = (imageBase64) => provider.analyzeFace(imageBase64)
export const generateCards = (analysis) => provider.generateCards(analysis)
export const generateStyledPhoto = (imageBase64, card) => gemini.generateStyledPhoto(imageBase64, card)
