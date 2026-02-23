import {
  buildHairContext, buildMakeupContext, buildTotalContext,
  HAIR_CARDS_FORMAT, MAKEUP_CARDS_FORMAT, TOTAL_CARDS_FORMAT,
  ANALYZE_PROMPT,
} from '../utils/ragUtils'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const VISION_MODEL = 'gemini-2.5-flash'
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

function parseCards(data) {
  const text = data.candidates[0].content.parts[0].text
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('카드 데이터를 읽을 수 없습니다.')
  return JSON.parse(jsonMatch[0])
}

function buildCardsPrompt(analysis, ragContext, outputFormat, domain, colorRule) {
  const colorLine = analysis.personalColor
    ? `- 퍼스널컬러: ${analysis.personalColor}`
    : `- 퍼스널컬러: 미정 (사용자가 퍼스널컬러를 모름)`

  return `당신은 전문 뷰티 코치입니다. 아래 얼굴 분석 결과와 RAG 지식베이스를 참고해 ${domain} 코디 카드 4장을 JSON 배열로 생성하세요. 다른 텍스트 없이 JSON만 응답하세요.
추천 카드 3장은 적합도 높은 순으로 rank 1(가장 잘 어울림), rank 2, rank 3을 부여하세요.

## 얼굴 분석
- 얼굴형: ${analysis.faceType}
${colorLine}
- 이목구비 특징: ${(analysis.features ?? []).join(', ')}

## RAG 지식베이스
${ragContext}

## 출력 형식
${outputFormat}

규칙: ${colorRule}`
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
  const result = JSON.parse(jsonMatch[0])
  if (result.error) throw new Error(result.error)
  return result
}

// ─── 헤어 카드 4장 생성 ───────────────────────────────────────────
export async function generateHairCards(analysis) {
  const ragContext = buildHairContext(analysis)
  const prompt = buildCardsPrompt(
    analysis,
    ragContext,
    HAIR_CARDS_FORMAT,
    '헤어',
    '추천 3장은 서로 다른 분위기(예: 청순/시크/캐주얼)로 구성하세요.'
  )
  const data = await callGemini(VISION_MODEL, [{ text: prompt }], 'application/json')
  return parseCards(data)
}

// ─── 메이크업 카드 4장 생성 ───────────────────────────────────────
export async function generateMakeupCards(analysis) {
  const ragContext = buildMakeupContext(analysis)
  const colorRule = analysis.personalColor
    ? '추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.'
    : '퍼스널컬러 정보가 없으므로 메이크업은 특정 색상 대신 질감·효과 위주로 표현하세요. 추천 3장은 서로 다른 분위기로 구성하세요.'
  const prompt = buildCardsPrompt(analysis, ragContext, MAKEUP_CARDS_FORMAT, '메이크업', colorRule)
  const data = await callGemini(VISION_MODEL, [{ text: prompt }], 'application/json')
  return parseCards(data)
}

// ─── 종합 카드 4장 생성 ───────────────────────────────────────────
export async function generateTotalCards(analysis) {
  const ragContext = buildTotalContext(analysis)
  const colorRule = analysis.personalColor
    ? '추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.'
    : '퍼스널컬러 정보가 없으므로 메이크업은 특정 색상 대신 질감·효과 위주로 표현하세요. 추천 3장은 서로 다른 분위기로 구성하세요.'
  const prompt = buildCardsPrompt(analysis, ragContext, TOTAL_CARDS_FORMAT, '헤어+메이크업 종합', colorRule)
  const data = await callGemini(VISION_MODEL, [{ text: prompt }], 'application/json')
  return parseCards(data)
}

// ─── 카드 3세트 병렬 생성 ─────────────────────────────────────────
export async function generateAllCards(analysis) {
  const [hair, makeup, total] = await Promise.all([
    generateHairCards(analysis),
    generateMakeupCards(analysis),
    generateTotalCards(analysis),
  ])
  return { hair, makeup, total }
}

// ─── 스타일 적용 사진 생성 ────────────────────────────────────────
export async function generateStyledPhoto(imageBase64, card) {
  const base64Data = imageBase64.split(',')[1]
  const mimeType = imageBase64.split(';')[0].split(':')[1]

  const hairLine = card.hair ? `헤어스타일: ${card.hair}` : ''
  const makeupLines = card.makeup
    ? `립 컬러: ${card.makeup.lip}\n블러셔: ${card.makeup.blush}\n아이섀도우: ${card.makeup.eyeshadow}`
    : ''
  const styleDesc = [hairLine, makeupLines].filter(Boolean).join('\n')

  const changeTarget = [card.hair && '헤어스타일', card.makeup && '메이크업'].filter(Boolean).join('과 ')

  const prompt = `이 사람의 사진을 아래 스타일로 변경해주세요.

${styleDesc}

규칙:
- 얼굴 형태, 피부톤, 이목구비는 원본과 동일하게 유지
- ${changeTarget}만 자연스럽게 변경
- 실제 사람처럼 현실적으로 표현
- 출력 이미지 비율은 3:4 (세로가 긴 세로형)`

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
