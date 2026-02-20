import hairData from '../data/hair-face-json.json'
import makeupData from '../data/makeup-json.json'
import featureTipsData from '../data/featureTips-json.json'

export const FACE_TYPE_MAP = {
  '계란형': 'oval', '둥근형': 'round', '사각형': 'square',
  '하트형': 'heart', '긴형': 'long', '다이아몬드형': 'diamond',
}

export const COLOR_MAP = {
  '봄웜': 'spring_warm', '여름쿨': 'summer_cool',
  '가을웜': 'autumn_warm', '겨울쿨': 'winter_cool',
}

export function buildRagContext(analysis) {
  const faceKey = FACE_TYPE_MAP[analysis.faceType]
  const colorKey = COLOR_MAP[analysis.personalColor]

  const hair = hairData.hairByFaceType.find(h => h.faceType === faceKey) ?? {}
  const makeup = makeupData.makeupByPersonalColor.find(m => m.personalColor === colorKey) ?? {}

  const tips = analysis.features
    .map(f => featureTipsData.featureTips.find(t => t.label.includes(f)))
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

export const CARDS_OUTPUT_FORMAT = `[
  {
    "type": "recommend",
    "mood": "스타일 무드명 (예: 청순 내추럴)",
    "emoji": "이모지 1개",
    "hair": "헤어스타일명",
    "hairReason": "왜 어울리는지 1문장",
    "makeup": { "lip": "립 컬러명", "blush": "블러셔", "eyeshadow": "아이섀도우" },
    "coachComment": "왜 이 스타일이 나한테 맞는지 2-3문장 전문가 설명"
  },
  { },
  { },
  {
    "type": "avoid",
    "mood": "피해야 할 스타일",
    "emoji": "⚠️",
    "hair": "피해야 할 헤어스타일",
    "hairReason": "왜 안 어울리는지 1문장",
    "makeup": { "lip": "피해야 할 립", "blush": "피해야 할 블러셔", "eyeshadow": "피해야 할 아이섀도우" },
    "coachComment": "왜 이 스타일이 나한테 맞지 않는지 2-3문장 전문가 설명"
  }
]`

export const ANALYZE_PROMPT = `이 사람의 얼굴을 분석해주세요. 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 중 하나",
  "personalColor": "봄웜 | 여름쿨 | 가을웜 | 겨울쿨 중 하나",
  "colorConfidence": "high | medium | low 중 하나",
  "features": ["아래 목록에서 해당되는 항목만 2~4개 선택"]
}

얼굴형 기준:
- 계란형: 이마가 약간 넓고 턱으로 갈수록 좁아지는 형태
- 둥근형: 얼굴 폭과 길이가 비슷하고 윤곽이 부드러운 형태
- 사각형: 이마와 턱의 폭이 비슷하고 각진 형태
- 하트형: 이마가 넓고 턱이 뾰족한 형태
- 긴형: 얼굴 길이가 폭보다 확연히 긴 형태
- 다이아몬드형: 옆광대가 발달하고 이마와 턱이 모두 좁은 형태

퍼스널컬러 기준:
- 봄웜: 밝고 화사한 황금빛·복숭아빛 피부
- 여름쿨: 밝고 차가운 핑크빛·로즈빛 피부
- 가을웜: 깊고 따뜻한 황갈빛·베이지빛 피부
- 겨울쿨: 선명하고 차가운 블루빛·다크 피부

colorConfidence:
- high: 사진에서 확실하게 판단 가능
- medium: 어느 정도 판단 가능하나 확신하기 어려움
- low: 조명·사진 품질로 판단이 매우 어려움

features 선택 목록 (이 목록에서만 골라서 정확히 이 텍스트 그대로 사용):
"눈 간격 넓음", "눈 간격 좁음", "코 낮음", "코 높음", "코 큼",
"이마 넓음", "이마 좁음", "눈 작음", "광대 넓음", "입술 얇음",
"입술 두꺼움", "중안부 긴 유형", "중안부 짧은 유형", "눈두덩이 좁음",
"눈두덩이 넓음", "관자놀이 여백 넓음", "사각턱", "돌출입", "목 짧음"`
