/**
 * 백엔드 응답 스키마 → 프론트 mappers 호환성 통합 테스트.
 *
 * 백엔드 test_integration.py 의 stub 응답과 동일한 카드 모양을 사용해서,
 * mappers.mapCards 가 정상 정규화하는지 확인한다.
 */
import { describe, it, expect } from 'vitest';
import { mapCards } from '../src/api/mappers';

const BACKEND_HAIR_RESPONSE = [
  {
    type: 'recommend', rank: 1, cardType: 'hair',
    mood: '청순 내추럴', moodLabel: 'ROMANTIC · 우아한 분위기', emoji: '🌸',
    hair: '쿠션 단발', bangs: '시스루뱅',
    hairReason: '계란형에 자연스럽게 어울려요.',
    featureTip: '부드러운 눈매를 강조하기 위해 C컬을 활용',
    coachComment: '쿠션 단발은 둥근 인상을 살리면서 우아한 무드를 더해줍니다.',
  },
  {
    type: 'recommend', rank: 2, cardType: 'hair',
    mood: '시크 레이어드', moodLabel: 'CLEAN · 도시적 분위기', emoji: '✨',
    hair: '레이어드 컷', bangs: '사이드뱅',
    hairReason: '사이드 레이어가 옆 라인을 정돈해 줍니다.',
    featureTip: null,
    coachComment: '레이어드 컷은 세련된 인상을 줍니다.',
  },
  {
    type: 'recommend', rank: 3, cardType: 'hair',
    mood: '오피스 단정', moodLabel: 'CLASSIC · 단정한 분위기', emoji: '💼',
    hair: '단발 외컬', bangs: '없음',
    hairReason: '깔끔한 선이 단정한 인상을 줍니다.',
    featureTip: null,
    coachComment: '외컬 단발은 정돈된 오피스 룩에 잘 맞아요.',
  },
  {
    type: 'avoid', cardType: 'hair',
    mood: '피해야 할 헤어', moodLabel: null, emoji: '⚠️',
    hair: '원랭스 롱 스트레이트', bangs: null,
    hairReason: '얼굴 폭이 더 넓어 보일 수 있어요.',
    featureTip: null,
    coachComment: '원랭스 롱은 둥근 얼굴이 더 강조될 수 있어 권하지 않아요.',
  },
];

const BACKEND_MAKEUP_RESPONSE = [
  {
    type: 'recommend', rank: 1, cardType: 'makeup',
    mood: '생기 발랄', moodLabel: 'FRESH · 생기 발랄', emoji: '🌸',
    baseSkin: 'Semi-Glow',
    makeup: {
      shading: '광대 아래 음영', shadingReason: '입체감',
      highlight: '앞광대 물광', highlightReason: '생기',
      blush: '피치', blushReason: '혈색',
      eyebrow: '라이트 브라운', eyebrowReason: '투명',
      lip: '코랄', lipReason: '화사',
      eyeshadow: '샴페인 골드', eyeshadowReason: '트임',
      eyeliner: '브라운 점막', eyelinerReason: '맑음',
    },
    featureTip: '눈 앞머리 강조',
    coachComment: '코랄 + 피치 조합은 생기 있는 인상을 만들어요.',
  },
  {
    type: 'avoid', cardType: 'makeup',
    mood: '피해야 할 메이크업', moodLabel: null, emoji: '⚠️',
    baseSkin: null,
    makeup: { lip: '다크 버건디', lipReason: '무거움' },
    featureTip: null,
    coachComment: '다크 컬러는 얼굴을 무겁게 만들어요.',
  },
];

const ANALYSIS_CTX = {
  result: {
    faceType: '계란형',
    moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'],
  },
  features: ['부드러운 눈매', '균형잡힌 비율'],
};

describe('백엔드 헤어 카드 응답 → mappers 호환성', () => {
  const cards = mapCards(BACKEND_HAIR_RESPONSE, 'hair', ANALYSIS_CTX);

  it('카드 4장이 모두 정규화된다', () => {
    expect(cards).toHaveLength(4);
  });

  it('rank 1 카드: name=hair, sub=bangs · moodLabel, badge=BEST', () => {
    const c = cards[0];
    expect(c.name).toBe('쿠션 단발');
    expect(c.sub).toBe('시스루뱅 · ROMANTIC · 우아한 분위기');
    expect(c.badge).toBe('BEST');
    expect(c.locked).toBe(false);
    expect(c.warn).toBe(false);
    expect(c.commentary).toContain('쿠션 단발');
  });

  it('avoid 카드: warn=true, rank=0, AVOID 라벨이 사용된다', () => {
    const avoid = cards.find((c) => c.warn);
    expect(avoid).toBeDefined();
    expect(avoid.rank).toBe(0);
    expect(avoid.badge).toBeNull();
    expect(avoid.name).toBe('원랭스 롱 스트레이트');
  });

  it('rank 2/3 는 BEST 배지를 받지 않는다', () => {
    expect(cards[1].badge).toBeNull();
    expect(cards[2].badge).toBeNull();
  });

  it('personalFit 에 헤어/앞머리/featureTip 또는 features 가 들어있다', () => {
    const c = cards[0];
    expect(c.personalFit.length).toBeGreaterThanOrEqual(2);
    const kws = c.personalFit.map((p) => p.kw);
    expect(kws).toContain('헤어');
  });

  it('moodBoard: 카드 moodLabel 키워드 + result.moodArchetype 가 dedupe 후 최대 3개', () => {
    const c = cards[0]; // ROMANTIC · ...
    expect(c.moodBoard.length).toBeGreaterThan(0);
    expect(c.moodBoard.length).toBeLessThanOrEqual(3);
    const kws = c.moodBoard.map((m) => m.kw);
    expect(new Set(kws).size).toBe(kws.length); // dedupe
  });
});

describe('백엔드 메이크업 카드 응답 → mappers 호환성', () => {
  const cards = mapCards(BACKEND_MAKEUP_RESPONSE, 'makeup', ANALYSIS_CTX);

  it('정규화 카드는 name=mood, sub=baseSkin · moodLabel', () => {
    expect(cards[0].name).toBe('생기 발랄');
    expect(cards[0].sub).toBe('Semi-Glow · FRESH · 생기 발랄');
  });

  it('personalFit 은 makeup 객체의 part 들로부터 만들어짐', () => {
    const fit = cards[0].personalFit;
    const kws = fit.map((f) => f.kw);
    // makeup.blush 가 있으니 '블러셔', .lip 가 있으니 '립' 포함.
    expect(kws).toContain('블러셔');
    expect(kws).toContain('립');
  });

  it('avoid 메이크업도 정규화 (warn=true, name=mood)', () => {
    const a = cards[1];
    expect(a.warn).toBe(true);
    expect(a.name).toBe('피해야 할 메이크업');
  });
});

describe('퍼블리시티권 회귀 가드', () => {
  it('정규화된 응답 어디에도 인물 비교 표현이 없어야 한다', () => {
    const all = [
      ...mapCards(BACKEND_HAIR_RESPONSE, 'hair', ANALYSIS_CTX),
      ...mapCards(BACKEND_MAKEUP_RESPONSE, 'makeup', ANALYSIS_CTX),
    ];
    const blob = JSON.stringify(all);
    for (const w of ['st 룩', '닮은꼴', 'look-alike', 'celebrityMatch']) {
      expect(blob).not.toContain(w);
    }
  });
});
