/**
 * 백엔드(Gemini) 응답 → 프론트 컴포넌트 props 모양으로 정규화.
 *
 * 백엔드 카드 스키마는 backend/services/rag_service.py 의 *_CARDS_FORMAT 참조.
 * - HAIR:  { type, rank, mood, moodLabel, hair, bangs, hairReason, featureTip, coachComment }
 * - MAKEUP:{ type, rank, mood, moodLabel, baseSkin, makeup{...}, featureTip, coachComment }
 * - TOTAL: HAIR + MAKEUP 합본
 *
 * 프론트(CardList/CardDetail/MakeupDetail) 가 기대하는 모양:
 *   { name, sub, rank, locked, warn, badge, commentary, personalFit[], moodBoard[] }
 *
 * v1.0 정책 — 모든 카드는 무료(locked=false). v1.1 부터 rank 2/3 잠금(별도 정책 모듈에서 결정).
 */

import { MOOD_PALETTES } from './moodPalette';

const ORDINAL_BADGES = { 1: 'BEST', 2: null, 3: null };

function clean(arr) {
  return arr.filter((s) => s != null && s !== '');
}

function asPersonalFitFromMakeup(card) {
  const m = card.makeup || {};
  const list = [];
  if (m.shading) list.push({ kw: '쉐딩', target: '윤곽', point: m.shading });
  if (m.highlight) list.push({ kw: '하이라이트', target: '윤기', point: m.highlight });
  if (m.blush) list.push({ kw: '블러셔', target: '혈색', point: m.blush });
  if (m.lip) list.push({ kw: '립', target: '입술', point: m.lip });
  if (m.eyeshadow) list.push({ kw: '아이섀도우', target: '눈매', point: m.eyeshadow });
  if (m.eyeliner) list.push({ kw: '아이라이너', target: '눈매', point: m.eyeliner });
  if (m.eyebrow) list.push({ kw: '눈썹', target: '인상', point: m.eyebrow });
  return list.slice(0, 5);
}

function asPersonalFitFromHair(card, features) {
  const list = [];
  if (card.hair) list.push({ kw: '헤어', target: '얼굴형', point: card.hairReason || card.hair });
  if (card.bangs && card.bangs !== '없음') list.push({ kw: '앞머리', target: '이마 비율', point: card.bangs });
  if (card.featureTip) list.push({ kw: '특징 팁', target: '맞춤', point: card.featureTip });
  // features 가 있으면 일부 추가 — 빈 자리에만 채우기.
  if (features && list.length < 3) {
    for (const f of features.slice(0, 3 - list.length)) {
      list.push({ kw: f, target: '특징', point: '카드 추천에 반영했어요' });
    }
  }
  return list.slice(0, 5);
}

function moodBoardFromLabel(moodLabel) {
  // moodLabel = "ELEGANT · 우아한 분위기" 형태. 첫 키워드만 뽑아 팔레트로.
  if (!moodLabel) return [];
  const kw = moodLabel.split(/\s*·\s*/)[0]?.trim()?.toUpperCase();
  const palette = MOOD_PALETTES[kw];
  if (!palette) return [];
  return [
    { kw, kr: moodLabel.split(/\s*·\s*/)[1] || '', c1: palette.c1, c2: palette.c2 },
  ];
}

function buildMoodBoard(card, result) {
  const cardSide = moodBoardFromLabel(card.moodLabel);
  const resultSide = (result?.moodArchetype || []).map((kw) => {
    const palette = MOOD_PALETTES[kw] || MOOD_PALETTES.ROMANTIC;
    return { kw, kr: '', c1: palette.c1, c2: palette.c2 };
  });
  // 카드 쪽 무드 + 결과 무드 병합, 같은 키 중복 제거, 최대 3개.
  const seen = new Set();
  const out = [];
  for (const it of [...cardSide, ...resultSide]) {
    if (seen.has(it.kw)) continue;
    seen.add(it.kw);
    out.push(it);
    if (out.length >= 3) break;
  }
  return out;
}

/** 헤어 카드 정규화 — CardList/CardDetail 가 직접 사용. */
export function mapHairCard(card, ctx = {}) {
  const isAvoid = card.type === 'avoid';
  const sub = clean([card.bangs, card.moodLabel]).join(' · ') || card.hairReason || '';
  return {
    ...card,
    rank: isAvoid ? 0 : card.rank ?? 0,
    name: card.hair || card.mood || '',
    sub: isAvoid ? (card.hairReason || '얼굴형과 잘 맞지 않을 수 있어요') : sub,
    locked: false, // v1.0 — 모든 카드 무료. v1.1 광고 게이트 도입 시 변경.
    warn: isAvoid,
    badge: isAvoid ? null : ORDINAL_BADGES[card.rank] || null,
    commentary: card.coachComment || '',
    personalFit: asPersonalFitFromHair(card, ctx.features),
    moodBoard: buildMoodBoard(card, ctx.result),
  };
}

/** 메이크업 카드 정규화 — CardList/MakeupDetail 가 직접 사용. */
export function mapMakeupCard(card, ctx = {}) {
  const isAvoid = card.type === 'avoid';
  const sub = clean([card.baseSkin, card.moodLabel]).join(' · ') || card.featureTip || '';
  return {
    ...card,
    rank: isAvoid ? 0 : card.rank ?? 0,
    name: card.mood || card.moodLabel || '',
    sub: isAvoid ? (card.coachComment?.split(/[.\s]/).slice(0, 12).join(' ') || '권장하지 않아요') : sub,
    locked: false,
    warn: isAvoid,
    badge: isAvoid ? null : ORDINAL_BADGES[card.rank] || null,
    commentary: card.coachComment || '',
    personalFit: asPersonalFitFromMakeup(card),
    moodBoard: buildMoodBoard(card, ctx.result),
    // recommendedProducts 는 백엔드가 직접 제공할 자리(v1.0 보류) — 없으면 MakeupDetail 의 PRODUCTS_MOCK 사용.
    recommendedProducts: card.recommendedProducts || null,
  };
}

/** 카드 배열 매핑 — type 별 분기. */
export function mapCards(cards, type, ctx) {
  if (!Array.isArray(cards)) return [];
  const fn = type === 'makeup' ? mapMakeupCard : mapHairCard;
  return cards.map((c) => fn(c, ctx));
}
