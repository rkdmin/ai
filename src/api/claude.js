import { buildRagContext, CARDS_OUTPUT_FORMAT, ANALYZE_PROMPT } from '../utils/ragUtils'

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
  return JSON.parse(jsonMatch[0])
}

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

  const response = await callClaude([{ role: 'user', content: prompt }], 2048)

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
