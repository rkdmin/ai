import hairData from '../data/hair-face-json.json'
import makeupData from '../data/makeup-json.json'
import featureTipsData from '../data/featureTips-json.json'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const FACE_TYPE_MAP = {
  '계란형': 'oval', '둥근형': 'round', '사각형': 'square',
  '하트형': 'heart', '긴형': 'long', '다이아몬드형': 'diamond',
}

const COLOR_MAP = {
  '봄웜': 'spring_warm', '여름쿨': 'summer_cool',
  '가을웜': 'autumn_warm', '겨울쿨': 'winter_cool',
}

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

// ─── STEP 4: 얼굴 분석 ────────────────────────────────────────────
export async function analyzeFace(imageBase64) {
  const base64Data = imageBase64.split(',')[1]
  const mediaType = imageBase64.split(';')[0].split(':')[1]

  const response = await callClaude([
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
        {
          type: 'text',
          text: `이 사람의 얼굴을 분석해주세요. 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 중 하나",
  "personalColor": "봄웜 | 여름쿨 | 가을웜 | 겨울쿨 중 하나",
  "colorConfidence": "high | medium | low 중 하나",
  "features": ["이목구비 특징을 한국어로 2~4개"]
}

얼굴형 기준:
- 계란형: 이마가 약간 넓고 턱으로 갈수록 좁아지는 형태
- 둥근형: 얼굴 폭과 길이가 비슷하고 윤곽이 부드러운 형태
- 사각형: 이마와 턱의 폭이 비슷하고 각진 형태
- 하트형: 이마가 넓고 턱이 뾰족한 형태
- 긴형: 얼굴 길이가 폭보다 확연히 긴 형태

퍼스널컬러 기준:
- 봄웜: 밝고 화사한 황금빛·복숭아빛 피부
- 여름쿨: 밝고 차가운 핑크빛·로즈빛 피부
- 가을웜: 깊고 따뜻한 황갈빛·베이지빛 피부
- 겨울쿨: 선명하고 차가운 블루빛·다크 피부

colorConfidence:
- high: 사진에서 확실하게 판단 가능
- medium: 어느 정도 판단 가능하나 확신하기 어려움
- low: 조명·사진 품질로 판단이 매우 어려움

features 예시: "눈 간격이 넓음", "코 높이가 낮음", "입술이 두꺼움", "턱선이 각짐"`,
        },
      ],
    },
  ])

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

// ─── STEP 6: 코디 카드 4장 생성 ──────────────────────────────────
function buildRagContext(analysis) {
  const faceKey = FACE_TYPE_MAP[analysis.faceType]
  const colorKey = COLOR_MAP[analysis.personalColor]

  const hair = hairData.hairByFaceType.find(h => h.faceType === faceKey) ?? {}
  const makeup = makeupData.makeupByPersonalColor.find(m => m.personalColor === colorKey) ?? {}

  const tips = analysis.features
    .map(f => featureTipsData.featureTips.find(t => f.includes(t.label.split(' ')[0]) || t.label.includes(f)))
    .filter(Boolean)

  const hairCtx = `
[헤어 — ${analysis.faceType}]
추천: ${(hair.recommend ?? []).map(r => `${r.style}(${r.reason})`).join(' / ')}
피해야 할: ${(hair.avoid ?? []).map(a => `${a.style}(${a.reason})`).join(' / ')}
코치: ${hair.coachComment ?? ''}`

  const makeupCtx = `
[메이크업 — ${analysis.personalColor}]
립: ${(makeup.lip ?? []).map(l => l.style).join(' / ')}
블러셔: ${(makeup.blush ?? []).map(b => b.style).join(' / ')}
아이섀도우: ${(makeup.eyeshadow ?? []).map(e => e.style).join(' / ')}
피해야 할: ${(makeup.avoid ?? []).map(a => a.style).join(' / ')}
코치: ${makeup.coachComment ?? ''}`

  const tipsCtx = tips.length
    ? '\n[이목구비 팁]\n' + tips.map(t => `${t.label}: 메이크업-${t.makeupTip} / 헤어-${t.hairTip}`).join('\n')
    : ''

  return hairCtx + makeupCtx + tipsCtx
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
[
  {
    "type": "recommend",
    "mood": "스타일 무드명 (예: 청순 내추럴)",
    "emoji": "이모지 1개",
    "hair": "헤어스타일명",
    "hairReason": "왜 어울리는지 1문장",
    "makeup": { "lip": "립 컬러명", "blush": "블러셔", "eyeshadow": "아이섀도우" },
    "coachComment": "왜 이 스타일이 나한테 맞는지 2-3문장 전문가 설명"
  },
  { (추천 카드 2번) },
  { (추천 카드 3번) },
  {
    "type": "avoid",
    "mood": "피해야 할 스타일",
    "emoji": "⚠️",
    "hair": "피해야 할 헤어스타일",
    "hairReason": "왜 안 어울리는지 1문장",
    "makeup": { "lip": "피해야 할 립", "blush": "피해야 할 블러셔", "eyeshadow": "피해야 할 아이섀도우" },
    "coachComment": "왜 이 스타일이 나한테 맞지 않는지 2-3문장 전문가 설명"
  }
]

규칙: 추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요.`

  const response = await callClaude(
    [{ role: 'user', content: prompt }],
    2048
  )

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
