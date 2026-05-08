import { describe, it, expect } from 'vitest';
import { mapHairCard, mapMakeupCard, mapCards } from '../src/api/mappers';

describe('mapHairCard', () => {
  const baseHair = {
    type: 'recommend', rank: 1, cardType: 'hair',
    mood: '청순', moodLabel: 'ROMANTIC · 청순',
    hair: '쿠션 단발', bangs: '시스루뱅',
    hairReason: '둥근 얼굴형에 어울려요',
    featureTip: '눈매 강조',
    coachComment: '풀 코멘트입니다.',
  };

  it('recommend 카드는 name=hair, sub=bangs · moodLabel, locked=false, warn=false 로 정규화', () => {
    const c = mapHairCard(baseHair);
    expect(c.name).toBe('쿠션 단발');
    expect(c.sub).toBe('시스루뱅 · ROMANTIC · 청순');
    expect(c.locked).toBe(false);
    expect(c.warn).toBe(false);
    expect(c.badge).toBe('BEST');
    expect(c.commentary).toBe('풀 코멘트입니다.');
  });

  it('avoid 카드는 warn=true, rank=0, badge=null', () => {
    const c = mapHairCard({ ...baseHair, type: 'avoid', rank: undefined });
    expect(c.warn).toBe(true);
    expect(c.rank).toBe(0);
    expect(c.badge).toBeNull();
    expect(c.locked).toBe(false);
  });

  it('rank 2 는 BEST 배지를 받지 않음', () => {
    const c = mapHairCard({ ...baseHair, rank: 2 });
    expect(c.badge).toBeNull();
  });

  it('personalFit 에 헤어 / 앞머리 / featureTip 이 포함됨', () => {
    const c = mapHairCard(baseHair);
    expect(c.personalFit.length).toBeGreaterThanOrEqual(2);
    const kws = c.personalFit.map((f) => f.kw);
    expect(kws).toContain('헤어');
    expect(kws).toContain('앞머리');
  });

  it('moodBoard 는 moodLabel + result.moodArchetype 키워드를 dedupe 후 최대 3개', () => {
    const ctx = { result: { moodArchetype: ['CLEAN', 'ROMANTIC', 'SOFT'] } };
    const c = mapHairCard(baseHair, ctx);
    expect(c.moodBoard.length).toBeLessThanOrEqual(3);
    const kws = c.moodBoard.map((m) => m.kw);
    // ROMANTIC 은 카드측에서 한 번만, dedupe.
    expect(new Set(kws).size).toBe(kws.length);
    expect(kws).toContain('ROMANTIC');
  });
});

describe('mapMakeupCard', () => {
  const baseMakeup = {
    type: 'recommend', rank: 1, cardType: 'makeup',
    mood: '생기 발랄', moodLabel: 'FRESH · 생기 발랄',
    baseSkin: 'Semi-Glow',
    makeup: {
      shading: '광대 아래 음영', shadingReason: '입체감',
      highlight: '앞광대 물광', highlightReason: '생기',
      blush: '피치', blushReason: '혈색',
      eyebrow: '라이트 브라운', eyebrowReason: '투명',
      lip: '코랄', lipReason: '화사',
      eyeshadow: null, eyeshadowReason: null,
      eyeliner: null, eyelinerReason: null,
    },
    featureTip: '아이라인 짧게',
    coachComment: '메이크업 코멘트',
  };

  it('recommend 메이크업은 name=mood, sub=baseSkin · moodLabel', () => {
    const c = mapMakeupCard(baseMakeup);
    expect(c.name).toBe('생기 발랄');
    expect(c.sub).toBe('Semi-Glow · FRESH · 생기 발랄');
    expect(c.warn).toBe(false);
    expect(c.locked).toBe(false);
  });

  it('personalFit 은 makeup 객체의 part 들로부터 만들어짐 (null 은 스킵)', () => {
    const c = mapMakeupCard(baseMakeup);
    const kws = c.personalFit.map((f) => f.kw);
    expect(kws).toContain('블러셔');
    expect(kws).toContain('립');
    expect(kws).not.toContain('아이섀도우'); // null 이라 빠져야 함
  });

  it('avoid 메이크업은 warn=true, rank=0', () => {
    const c = mapMakeupCard({ ...baseMakeup, type: 'avoid', rank: undefined });
    expect(c.warn).toBe(true);
    expect(c.rank).toBe(0);
  });
});

describe('mapCards', () => {
  it('빈 입력은 빈 배열', () => {
    expect(mapCards(null, 'hair')).toEqual([]);
    expect(mapCards(undefined, 'hair')).toEqual([]);
  });

  it('type 별로 올바른 매퍼 사용', () => {
    const hair = mapCards([{ type: 'recommend', rank: 1, cardType: 'hair', hair: 'a', mood: 'm' }], 'hair');
    expect(hair[0].name).toBe('a');

    const makeup = mapCards([{ type: 'recommend', rank: 1, cardType: 'makeup', mood: 'm' }], 'makeup');
    expect(makeup[0].name).toBe('m');
  });
});
