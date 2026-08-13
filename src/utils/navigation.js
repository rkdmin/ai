// 뒤로가기 복귀 지점 결정 로직.
//
// App.jsx 밖으로 뺀 이유: 순수 함수라 단위 테스트가 가능하고,
// 화면 안 닫기 버튼과 하드웨어/브라우저 back 이 어긋나는 사고를 회귀로 막기 위해서다.
// (`share_card` 에서 실제로 어긋나 있었다 — onClose 는 card_detail, back 은 result_home)

/** 화면별 기본 복귀 지점. 진입 맥락과 무관하게 고정인 것들. */
export const PARENT_STAGE = {
  onboarding2: 'onboarding1',
  onboarding3: 'onboarding2',
  login: 'home',
  guest_gate: 'home',
  upload: 'home',
  personal_color: 'upload',
  loading: 'home',
  error_face: 'home',
  error_network: 'home',
  result_home: 'home',
  hair_loading: 'result_home',
  result_tabs_hair: 'result_home',
  card_detail: 'result_tabs_hair',
  // ad_gate / share_card 는 resolveParentStage 가 상태를 보고 덮어쓴다. 아래는 폴백값이다.
  ad_gate: 'result_tabs_hair',
  share_card: 'result_home',
  makeup_loading: 'result_home',
  result_tabs_makeup: 'result_home',
  makeup_detail: 'result_tabs_makeup',
  share_card_makeup: 'makeup_detail',
  trend: 'home',
  history: 'home',
  history_detail: 'history',
  my: 'home',
};

/**
 * 현재 stage 에서 뒤로 갈 곳을 정한다.
 *
 * 진입 맥락에 따라 달라지는 세 화면은 상태를 보고 결정한다.
 * **화면 안의 닫기 버튼과 결과가 같아야 한다** — 새 화면을 추가하면 그 화면의 onClose 로직을
 * 여기에도 반영한다.
 *
 * @param {string} cur 현재 stage
 * @param {{historySelection?: {back?: string}, adReturn?: {back?: string}, activeCard?: unknown}} ctx
 * @returns {string|undefined} 복귀할 stage. undefined 면 뒤로가기를 무시한다 (예: synth_loading)
 */
export function resolveParentStage(cur, ctx = {}) {
  switch (cur) {
    case 'history_detail':
      return ctx.historySelection?.back || 'history';
    case 'ad_gate':
      return ctx.adReturn?.back || PARENT_STAGE[cur];
    case 'share_card':
      // ShareCard 의 onClose 와 같은 규칙 — 카드에서 열었으면 카드로 돌아간다.
      return ctx.activeCard ? 'card_detail' : 'result_home';
    default:
      return PARENT_STAGE[cur];
  }
}
