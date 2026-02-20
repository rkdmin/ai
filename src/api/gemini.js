import { buildRagContext, CARDS_OUTPUT_FORMAT, ANALYZE_PROMPT } from '../utils/ragUtils'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const VISION_MODEL = 'gemini-2.0-flash'
const IMAGE_MODEL = 'gemini-2.5-flash-preview-image-generation'

async function callGemini(model, parts, responseMimeType = 'text/plain') {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API 오류 (${response.status})`)
  }

  return response.json()
}

// ─── 얼굴 분석 ────────────────────────────────────────────────────
export async function analyzeFace(imageBase64) {
  const base64Data = imageBase64.split(',')[1]
  const mimeType = imageBase64.split(';')[0].split(':')[1]

  const data = await callGemini(
    VISION_MODEL,
    [
      { inlineData: { mimeType, data: base64Data } },
      { text: ANALYZE_PROMPT },
    ],
    'application/json'
  )

  const text = data.candidates[0].content.parts[0].text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('분석 결과를 읽을 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── 코디 카드 4장 생성 ───────────────────────────────────────────
export async function generateCards(analysis) {
  const ragContext = buildRagContext(analysis)
  const prompt = `당신은 전문 뷰티 코치입니다. 아래 얼굴 분석 결과와 RAG 지식베이스를 참고해 코디 카드 4장을 JSON 배열로 생성하세요. 다른 텍스트 없이 JSON만 응답하세요.

## 얼굴 분석
- 얼굴형: ${analysis.faceType}
- 퍼스널컬러: ${analysis.personalColor}
- 이목구비 특징: ${analysis.features.join(', ')}

## RAG 지식베이스
${ragContext}

## 출력 형식
${CARDS_OUTPUT_FORMAT}

규칙: 추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.`

  const data = await callGemini(
    VISION_MODEL,
    [{ text: prompt }],
    'application/json'
  )

  const text = data.candidates[0].content.parts[0].text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('카드 데이터를 읽을 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

// ─── 스타일 적용 사진 생성 ────────────────────────────────────────
export async function generateStyledPhoto(imageBase64, card) {
  const base64Data = imageBase64.split(',')[1]
  const mimeType = imageBase64.split(';')[0].split(':')[1]

  const prompt = `이 사람의 사진을 아래 스타일로 변경해주세요.

헤어스타일: ${card.hair}
립 컬러: ${card.makeup.lip}
블러셔: ${card.makeup.blush}
아이섀도우: ${card.makeup.eyeshadow}

규칙:
- 얼굴 형태, 피부톤, 이목구비는 원본과 동일하게 유지
- 헤어스타일과 메이크업만 자연스럽게 변경
- 실제 사람처럼 현실적으로 표현`

  const data = await callGemini(
    IMAGE_MODEL,
    [
      { inlineData: { mimeType, data: base64Data } },
      { text: prompt },
    ]
  )

  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find(p => p.inlineData)
  if (!imagePart) throw new Error('이미지를 생성할 수 없습니다.')

  const { mimeType: outMime, data: outData } = imagePart.inlineData
  return `data:${outMime};base64,${outData}`
}
