import { MOOD_KR } from '../api/moodPalette';

// "SOFT · 자연스럽고 차분한" → "SOFT". 카드·리포트의 moodLabel 에서 눈썹 라벨로 쓸 키워드만 뽑는다.
// 8개 무드 키가 아니면 원문을 그대로 돌려준다 (인물 비교 표현은 백엔드가 이미 막는다).
export function moodLabelText(moodLabel) {
  const key = String(moodLabel || '').split('·')[0].trim().toUpperCase();
  return MOOD_KR[key] ? key : String(moodLabel || '').trim();
}
