/**
 * 8개 무드 키워드 → 팔레트 매핑.
 * AnalysisResult / CardDetail / MakeupDetail / mappers 가 공유한다.
 * 절대 인물 이미지를 쓰지 않는다 (퍼블리시티권 회피, CLAUDE.md 정책).
 */
export const MOOD_PALETTES = {
  ROMANTIC: { c1: '#f3d9c8', c2: '#c97b6e' },
  CLEAN:    { c1: '#f5e6d3', c2: '#d4a574' },
  SOFT:     { c1: '#e8d5c4', c2: '#a8896f' },
  ELEGANT:  { c1: '#ede2d0', c2: '#a8896f' },
  SHARP:    { c1: '#dcdcdc', c2: '#5a5a5a' },
  CLASSIC:  { c1: '#e0d4c4', c2: '#7a6549' },
  FRESH:    { c1: '#e8efe2', c2: '#8aa07a' },
  EDGY:     { c1: '#cfcfd2', c2: '#3a3a40' },
};

export const MOOD_KR = {
  ROMANTIC: '로맨틱',
  CLEAN: '클린',
  SOFT: '소프트',
  ELEGANT: '엘레강트',
  SHARP: '샤프',
  CLASSIC: '클래식',
  FRESH: '프레시',
  EDGY: '엣지',
};
