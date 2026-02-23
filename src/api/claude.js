import {
  buildHairContext, buildMakeupContext, buildTotalContext,
  HAIR_CARDS_FORMAT, MAKEUP_CARDS_FORMAT, TOTAL_CARDS_FORMAT,
  ANALYZE_PROMPT,
} from '../utils/ragUtils'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

function callClaude(messages, maxTokens = 1024) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages }),
  })
}

async function parseCards(response) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `카드 생성 오류 (${response.status})`)
  }
  const data = await response.json()
  const text = data.content[0].text
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
  const mediaType = imageBase64.split(';')[0].split(':')[1]

  const response = await callClaude([{
    role: 'user',
    content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
      { type: 'text', text: ANALYZE_PROMPT },
    ],
  }])

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const text = data.content[0].text
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('분석 결과를 읽을 수 없습니다.')
  const result = JSON.parse(jsonMatch[0])
  if (result.error) throw new Error(result.error)
  return result
}

// ─── 헤어 카드 4장 생성 ───────────────────────────────────────────
export async function generateHairCards(analysis) {
  const prompt = buildCardsPrompt(
    analysis,
    buildHairContext(analysis),
    HAIR_CARDS_FORMAT,
    '헤어',
    '추천 3장은 서로 다른 분위기(예: 청순/시크/캐주얼)로 구성하세요.'
  )
  return parseCards(await callClaude([{ role: 'user', content: prompt }], 2048))
}

// ─── 메이크업 카드 4장 생성 ───────────────────────────────────────
export async function generateMakeupCards(analysis) {
  const colorRule = analysis.personalColor
    ? '추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.'
    : '퍼스널컬러 정보가 없으므로 메이크업은 특정 색상 대신 질감·효과 위주로 표현하세요. 추천 3장은 서로 다른 분위기로 구성하세요.'
  const prompt = buildCardsPrompt(analysis, buildMakeupContext(analysis), MAKEUP_CARDS_FORMAT, '메이크업', colorRule)
  return parseCards(await callClaude([{ role: 'user', content: prompt }], 2048))
}

// ─── 종합 카드 4장 생성 ───────────────────────────────────────────
export async function generateTotalCards(analysis) {
  const colorRule = analysis.personalColor
    ? '추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.'
    : '퍼스널컬러 정보가 없으므로 메이크업은 특정 색상 대신 질감·효과 위주로 표현하세요. 추천 3장은 서로 다른 분위기로 구성하세요.'
  const prompt = buildCardsPrompt(analysis, buildTotalContext(analysis), TOTAL_CARDS_FORMAT, '헤어+메이크업 종합', colorRule)
  return parseCards(await callClaude([{ role: 'user', content: prompt }], 2048))
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
