import hairData from '../data/hair-face-json.json'
import makeupData from '../data/makeup-json.json'
import featureTipsData from '../data/featureTips-json.json'

export const FACE_TYPE_MAP = {
  '계란형': 'oval', '둥근형': 'round', '사각형': 'square',
  '하트형': 'heart', '긴형': 'long', '다이아몬드형': 'diamond', '땅콩형': 'peanut',
}

export const COLOR_MAP = {
  '봄웜': 'spring_warm', '여름쿨': 'summer_cool',
  '가을웜': 'autumn_warm', '겨울쿨': 'winter_cool',
}

export function buildRagContext(analysis) {
  const faceKey = FACE_TYPE_MAP[analysis.faceType]
  const colorKey = analysis.personalColor ? COLOR_MAP[analysis.personalColor] : null

  const hair = hairData.hairByFaceType.find(h => h.faceType === faceKey) ?? {}
  const makeup = colorKey
    ? makeupData.makeupByPersonalColor.find(m => m.personalColor === colorKey) ?? {}
    : null

  const tips = (analysis.features ?? [])
    .map(f => featureTipsData.featureTips.find(t => t.label.includes(f)))
    .filter(Boolean)

  const hairCtx = `
[헤어 — ${analysis.faceType}]
추천: ${(hair.recommend ?? []).map(r => `${r.style}(${r.reason})`).join(' / ')}
피해야 할: ${(hair.avoid ?? []).map(a => `${a.style}(${a.reason})`).join(' / ')}
코치: ${hair.coachComment ?? ''}`

  // 퍼스널컬러 없을 때: featureTips의 makeupTip을 보완 데이터로 활용
  const allMakeupTips = featureTipsData.featureTips
    .filter(t => tips.some(tip => tip.feature === t.feature))
    .map(t => t.makeupTip)

  const makeupCtx = makeup
    ? `
[메이크업 — ${analysis.personalColor}]
립: ${(makeup.lip ?? []).map(l => l.style).join(' / ')}
블러셔: ${(makeup.blush ?? []).map(b => b.style).join(' / ')}
아이섀도우: ${(makeup.eyeshadow ?? []).map(e => e.style).join(' / ')}
눈썹: ${(makeup.eyebrow ?? []).map(e => e.style).join(' / ')}
아이라이너: ${(makeup.eyeliner ?? []).map(e => e.style).join(' / ')}
쉐딩: ${(makeup.shading ?? []).map(s => s.style).join(' / ')}
하이라이터: ${(makeup.highlighter ?? []).map(h => h.style).join(' / ')}
피해야 할: ${(makeup.avoid ?? []).map(a => a.style).join(' / ')}
코치: ${makeup.coachComment ?? ''}`
    : `
[메이크업 — 퍼스널컬러 미정]
색상 대신 이목구비 보정 효과와 질감 위주로 추천하세요.${allMakeupTips.length > 0 ? '\n이목구비 메이크업 팁:\n' + allMakeupTips.join('\n') : '\n얼굴형 특징에 맞는 이목구비 보정 메이크업을 질감·효과 중심으로 구성하세요.'}`

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

export const ANALYZE_PROMPT = `당신은 뷰티 전문가입니다. 이 사람의 얼굴 사진을 분석하여 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 중 하나",
  "features": ["확실히 보이는 특징만, 0개도 가능"]
}

## 분석 원칙 (반드시 준수)
- **확실한 것만 포함**: 사진을 보고 즉시 "이건 확실하다"고 판단되는 것만 포함하세요.
- **애매하면 제외**: "아마도", "~인 것 같다", "~일 수도 있다" 수준이면 포함하지 마세요.
- **억지로 채우지 말 것**: 목록을 채우기 위해 불확실한 항목을 넣는 것은 잘못된 분석입니다. 빈 배열([])도 정답입니다.

---

## 얼굴형 판단 기준
반드시 가장 지배적인 특징 하나만 선택하세요. 두 유형이 섞여 보여도 더 강하게 드러나는 쪽으로 결정하세요.
- 계란형: 이마가 약간 넓고 턱으로 갈수록 자연스럽게 좁아지는 형태
- 둥근형: 얼굴 폭과 길이가 비슷하고 전체 윤곽이 부드럽고 볼살이 있는 형태
- 사각형: 이마와 턱의 폭이 비슷하며 하관 골격이 뚜렷하게 각진 형태
- 하트형: 이마·광대가 넓고 턱 끝이 뾰족하게 좁아지는 형태
- 긴형: 얼굴 세로 길이가 가로 폭보다 확연히 긴 형태
- 다이아몬드형: 옆광대가 가장 넓고 이마와 턱이 모두 좁은 형태
- 땅콩형: 옆광대와 하관(사각턱)이 모두 발달하고 볼이 패여 얼굴 라인이 울퉁불퉁한 형태

---

## features 판단 기준
아래 목록에서 **사진에서 명확하게 눈에 띄는 특징만** 골라 정확히 이 텍스트 그대로 사용하세요.
확신도 80% 미만이면 포함하지 마세요. 0개~3개가 적절하며, 4개 이상이면 다시 검토하세요.

선택 가능 목록:
"눈 간격 넓음", "눈 간격 좁음", "코 낮음", "코 높음", "코 큼",
"이마 넓음", "이마 좁음", "눈 작음", "광대 넓음", "입술 얇음",
"입술 두꺼움", "중안부 긴 유형", "중안부 짧은 유형", "눈두덩이 좁음",
"눈두덩이 넓음", "관자놀이 여백 넓음", "사각턱", "돌출입", "목 짧음",
"무쌍", "속쌍꺼풀", "눈꼬리 처짐", "눈꼬리 올라감", "눈꼬리 막힘",
"눈두덩이 살 두꺼움", "눈두덩이 살 얇음", "둥근 눈", "아몬드 눈", "긴 눈",
"삼백안", "인중 긺", "인중 짧음", "무턱", "주걱턱", "콘헤드",
"어깨 너비 넓음", "승모근 발달"`
