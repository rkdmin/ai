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

// ─── 헤어 카드 4장 ───────────────────────────────────────────────
export async function generateHairCards(_analysis) {
  await delay(800)
  return [
    {
      type: 'recommend', rank: 1, cardType: 'hair',
      mood: '청순 내추럴', emoji: '🌸',
      hair: '히피펌 미디엄',
      hairReason: '볼륨감이 얼굴 세로 길이를 늘려 둥근 얼굴형을 갸름하게 보이게 합니다.',
      featureTip: '눈 간격이 넓으니 눈 사이 가르마를 활용하면 시선이 모여 보입니다.',
      coachComment: '히피펌은 둥근 얼굴형에 자연스러운 볼륨을 더해 얼굴이 입체적으로 보여요. 중간 길이가 얼굴 비율을 잡아주는 최적의 선택입니다.',
    },
    {
      type: 'recommend', rank: 2, cardType: 'hair',
      mood: '시크 레이어드', emoji: '✨',
      hair: '레이어드 컷',
      hairReason: '사이드 레이어가 얼굴 옆선을 가려 갸름한 인상을 만들어 줍니다.',
      featureTip: '광대가 넓으니 귀 뒤로 넘기는 스타일보다 사이드를 내려두는 것이 유리합니다.',
      coachComment: '레이어드 컷은 얼굴 옆을 자연스럽게 커버하면서도 세련된 느낌을 줍니다. 광대가 넓은 경우 사이드 볼륨을 살리면 더욱 균형감이 좋아집니다.',
    },
    {
      type: 'recommend', rank: 3, cardType: 'hair',
      mood: '오피스 단정', emoji: '💼',
      hair: '단발 외컬',
      hairReason: '깔끔한 선으로 단정하면서도 얼굴 아래쪽에 공간을 만들어 세련된 인상을 줍니다.',
      featureTip: null,
      coachComment: '단발 외컬은 얼굴 라인을 정돈해주면서 전문적인 이미지를 연출합니다. 끝을 바깥쪽으로 살짝 말아주면 얼굴이 더 갸름해 보여요.',
    },
    {
      type: 'avoid', cardType: 'hair',
      mood: '피해야 할 헤어', emoji: '⚠️',
      hair: '원랭스 롱 스트레이트',
      hairReason: '얼굴 양옆에 볼륨이 없어 얼굴 폭이 더 강조되어 보입니다.',
      featureTip: null,
      coachComment: '원랭스 롱 스트레이트는 얼굴 좌우 폭을 그대로 드러내 둥근 얼굴형이 더 넓어 보입니다. 특히 광대가 넓은 경우 더 두드러질 수 있어요.',
    },
  ]
}

// ─── 메이크업 카드 4장 ────────────────────────────────────────────
export async function generateMakeupCards(_analysis) {
  await delay(800)
  return [
    {
      type: 'recommend', rank: 1, cardType: 'makeup',
      mood: '생기 발랄', emoji: '🌸',
      makeup: {
        lip: '코랄 핑크', lipReason: '피부 노란 기와 자연스럽게 어우러져 화사한 생기를 더해줍니다.',
        blush: '피치 블러셔', blushReason: '뺨에 맑은 혈색을 주어 입체감과 건강미를 동시에 연출합니다.',
        eyeshadow: '샴페인 골드', eyeshadowReason: '눈두덩에 가벼운 광채를 주어 눈매가 또렷하고 트여 보입니다.',
      },
      featureTip: '눈 간격이 넓으니 눈 앞머리에 진한 색을 모아 간격을 좁아 보이게 하세요.',
      coachComment: '코랄과 피치 계열의 조합은 둥근 얼굴형에 생동감을 더합니다. 전체적으로 가볍고 투명한 텍스처로 마무리하면 더욱 화사해 보여요.',
    },
    {
      type: 'recommend', rank: 2, cardType: 'makeup',
      mood: '시크 글램', emoji: '✨',
      makeup: {
        lip: '누드 오렌지', lipReason: '웜톤의 오렌지 계열이 이목구비를 또렷하게 부각시켜 줍니다.',
        blush: '테라코타 블러셔', blushReason: '얼굴 옆면에 음영을 주어 광대를 자연스럽게 커버합니다.',
        eyeshadow: '골드 쉬머', eyeshadowReason: '눈매에 포인트를 주어 얼굴 중심으로 시선을 유도합니다.',
      },
      featureTip: '코가 낮으니 노즈 쉐딩으로 코 양옆에 음영을 넣으면 입체감이 생깁니다.',
      coachComment: '골드와 테라코타의 조합으로 세련된 글램 룩을 완성합니다. 얼굴 옆에 쉐딩을 더하면 둥근 얼굴형이 더욱 갸름해 보여요.',
    },
    {
      type: 'recommend', rank: 3, cardType: 'makeup',
      mood: '오피스 시크', emoji: '💼',
      makeup: {
        lip: '로즈 베이지', lipReason: '과하지 않은 색감이 전문적이고 차분한 이미지를 만들어 줍니다.',
        blush: '살구 블러셔', blushReason: '자연스러운 혈색으로 건강한 인상을 주면서 얼굴을 환하게 합니다.',
        eyeshadow: '샴페인 베이지', eyeshadowReason: '은은한 광채로 눈매를 또렷하게 만들면서도 단정함을 유지합니다.',
      },
      featureTip: null,
      coachComment: '차분한 베이지 톤으로 통일감 있는 오피스 룩을 연출합니다. 전체적으로 정돈된 인상을 주면서도 세련미를 잃지 않는 조합이에요.',
    },
    {
      type: 'avoid', cardType: 'makeup',
      mood: '피해야 할 메이크업', emoji: '⚠️',
      makeup: {
        lip: '다크 버건디', lipReason: '어두운 컬러가 봄 웜톤의 화사함을 가라앉히고 얼굴을 무겁게 만듭니다.',
        blush: '진한 로즈 블러셔', blushReason: '채도 높은 블러셔가 광대를 더욱 부각시켜 얼굴이 넓어 보입니다.',
        eyeshadow: '블랙 스모키', eyeshadowReason: '강한 눈매가 부드러운 둥근 얼굴형과 어울리지 않아 부자연스럽습니다.',
      },
      featureTip: null,
      coachComment: '짙은 다크 컬러는 얼굴을 무겁고 어두워 보이게 합니다. 특히 둥근 얼굴형에는 블러셔를 광대 위쪽보다 아래쪽에 넣는 것이 훨씬 자연스러워요.',
    },
  ]
}

// ─── 종합 카드 4장 ───────────────────────────────────────────────
export async function generateTotalCards(_analysis) {
  await delay(800)
  return [
    {
      type: 'recommend', rank: 1, cardType: 'total',
      mood: '청순 내추럴', emoji: '🌸',
      hair: '히피펌 미디엄',
      hairReason: '볼륨감이 둥근 얼굴형을 갸름하게 보이게 합니다.',
      makeup: {
        lip: '코랄 핑크', lipReason: '웜톤 피부색과 자연스럽게 어우러져 화사한 생기를 더합니다.',
        blush: '피치 블러셔', blushReason: '맑은 혈색으로 입체감과 건강미를 동시에 연출합니다.',
        eyeshadow: '샴페인 골드', eyeshadowReason: '가벼운 광채로 눈매를 또렷하고 트여 보이게 합니다.',
      },
      featureTip: '눈 간격이 넓으니 아이라인을 눈 앞머리에 집중하고 가르마는 센터로 해주세요.',
      coachComment: '히피펌의 자연스러운 볼륨에 코랄·피치 메이크업을 더하면 청순하면서도 생기있는 이미지가 완성됩니다. 봄 웜톤의 화사함을 가장 잘 살릴 수 있는 조합이에요.',
    },
    {
      type: 'recommend', rank: 2, cardType: 'total',
      mood: '시크 글램', emoji: '✨',
      hair: '레이어드 컷',
      hairReason: '사이드 레이어가 얼굴 옆선을 자연스럽게 커버합니다.',
      makeup: {
        lip: '누드 오렌지', lipReason: '이목구비를 또렷하게 부각시켜 세련된 인상을 줍니다.',
        blush: '테라코타 블러셔', blushReason: '음영감으로 광대를 자연스럽게 커버합니다.',
        eyeshadow: '골드 쉬머', eyeshadowReason: '눈매 포인트로 얼굴 중심에 시선을 집중시킵니다.',
      },
      featureTip: '코가 낮으니 노즈 쉐딩을 더하면 전체 입체감이 훨씬 살아납니다.',
      coachComment: '레이어드 컷과 골드·테라코타 메이크업의 조합으로 완성되는 시크한 글램 룩입니다. 얼굴형을 보완하면서도 세련된 무드를 연출할 수 있어요.',
    },
    {
      type: 'recommend', rank: 3, cardType: 'total',
      mood: '오피스 시크', emoji: '💼',
      hair: '단발 외컬',
      hairReason: '깔끔한 선으로 단정하고 세련된 인상을 줍니다.',
      makeup: {
        lip: '로즈 베이지', lipReason: '차분한 색감이 전문적이고 정돈된 이미지를 만들어 줍니다.',
        blush: '살구 블러셔', blushReason: '자연스러운 혈색으로 건강하고 단정한 인상을 완성합니다.',
        eyeshadow: '샴페인 베이지', eyeshadowReason: '은은한 광채로 눈매를 또렷하게 하면서 단정함을 유지합니다.',
      },
      featureTip: null,
      coachComment: '단발 외컬과 베이지 톤 메이크업으로 완성되는 오피스 룩입니다. 전반적으로 정돈된 인상을 주면서도 지루하지 않은 세련미를 표현할 수 있어요.',
    },
    {
      type: 'avoid', cardType: 'total',
      mood: '피해야 할 스타일', emoji: '⚠️',
      hair: '원랭스 롱 스트레이트',
      hairReason: '얼굴 폭을 그대로 드러내 둥근 얼굴이 더 넓어 보입니다.',
      makeup: {
        lip: '다크 버건디', lipReason: '어두운 컬러가 얼굴을 무겁고 칙칙하게 만듭니다.',
        blush: '진한 로즈 블러셔', blushReason: '광대를 부각시켜 얼굴이 더 넓어 보입니다.',
        eyeshadow: '블랙 스모키', eyeshadowReason: '강한 눈매가 부드러운 얼굴형과 어울리지 않습니다.',
      },
      featureTip: null,
      coachComment: '원랭스 헤어와 다크 컬러 메이크업의 조합은 둥근 얼굴형의 단점을 모두 부각시킵니다. 볼륨 없는 헤어와 무거운 메이크업이 겹치면 얼굴이 훨씬 크고 무거워 보여요.',
    },
  ]
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
export async function generateStyledPhoto(imageBase64, _card) {
  await delay(1000)
  return imageBase64
}
