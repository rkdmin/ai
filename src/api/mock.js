/**
 * Mock AI — VITE_MOCK=true 일 때 실제 API 대신 사용
 * 토큰 소비 없이 UI 흐름 전체를 테스트할 수 있습니다.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── 얼굴 분석 ────────────────────────────────────────────────────
export async function analyzeFace(_imageBase64) {
  await delay(1200)
  return {
    faceType: '둥근형',
    features: ['눈 간격 넓음', '코 낮음', '광대 넓음'],
  }
}

// ─── 코디 카드 4장 생성 ───────────────────────────────────────────
export async function generateCards(_analysis) {
  await delay(1500)
  return [
    {
      type: 'recommend',
      mood: '청순 내추럴',
      emoji: '🌸',
      hair: '히피펌 미디엄',
      hairReason: '둥근 얼굴형에 볼륨을 더해 얼굴이 갸름해 보입니다.',
      makeup: { lip: '코랄 핑크', blush: '피치 블러셔', eyeshadow: '브라운 그라데이션' },
      coachComment: '봄 웜톤의 화사함을 살린 내추럴 룩입니다. 코랄 계열 립과 피치 블러셔로 혈색을 강조하면 더욱 생기있어 보여요.',
    },
    {
      type: 'recommend',
      mood: '시크 글램',
      emoji: '✨',
      hair: '레이어드 컷 스트레이트',
      hairReason: '얼굴 옆선을 가려 갸름한 인상을 만들어 줍니다.',
      makeup: { lip: '누드 오렌지', blush: '테라코타 블러셔', eyeshadow: '골드 쉬머' },
      coachComment: '웜톤의 골드 빛을 활용한 글램 룩입니다. 골드 아이섀도우로 눈매에 포인트를 주면 세련된 느낌을 완성할 수 있어요.',
    },
    {
      type: 'recommend',
      mood: '오피스 시크',
      emoji: '💼',
      hair: '단발 외컬',
      hairReason: '깔끔한 선으로 단정하면서도 세련된 인상을 줍니다.',
      makeup: { lip: '로즈 베이지', blush: '살구 블러셔', eyeshadow: '샴페인 베이지' },
      coachComment: '차분하면서도 세련된 오피스 룩입니다. 과하지 않은 색감으로 전문적인 이미지를 연출할 수 있어요.',
    },
    {
      type: 'avoid',
      mood: '피해야 할 스타일',
      emoji: '⚠️',
      hair: '원랭스 롱 스트레이트',
      hairReason: '얼굴 폭을 강조해 더 넓어 보일 수 있습니다.',
      makeup: { lip: '다크 버건디', blush: '진한 로즈 블러셔', eyeshadow: '블랙 스모키' },
      coachComment: '짙은 다크 컬러는 봄 웜톤의 화사함을 죽이고 얼굴이 무거워 보일 수 있어요. 둥근 얼굴형에 원랭스 헤어는 얼굴이 더 넓어 보이게 합니다.',
    },
  ]
}

// ─── 스타일 적용 사진 생성 ────────────────────────────────────────
// 실제 이미지 생성 없이 원본 사진을 그대로 반환
export async function generateStyledPhoto(imageBase64, _card) {
  await delay(1000)
  return imageBase64
}
