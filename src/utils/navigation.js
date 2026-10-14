// 앱 화면을 하나의 stage 문자열로 섞지 않고 역할별 route 로 구분한다.
// 상세와 시트는 origin route 를 직접 보관하므로 화면 버튼·브라우저·Android back 이 같은 곳으로 돌아간다.

export const MAIN_TABS = ['home', 'style', 'chemistry', 'my'];

const ANALYSIS_SCREENS = new Set([
  'upload',
  'loading',
  'error_face',
  'error_network',
  'result_home',
  'hair_loading',
  'result_tabs_hair',
  'makeup_loading',
  'result_tabs_makeup',
  'synth_loading',
]);

const DETAIL_SCREENS = new Set(['history', 'history_detail', 'card_detail', 'makeup_detail']);
// 온보딩·독립 로그인·광고 게이트는 Figma 에 없어 뺐다 (ADR 0010). 계정 연결은 guest_gate 시트 하나다.
const SHEET_SCREENS = new Set(['guest_gate', 'share_card', 'share_card_makeup']);
const FLOW_SCREENS = new Set(['splash']);

export function mainRoute(tab = 'home') {
  return { kind: 'main', tab: MAIN_TABS.includes(tab) ? tab : 'home' };
}

export function analysisRoute(screen) {
  return { kind: 'analysis', screen };
}

export function detailRoute(screen, origin = mainRoute('home')) {
  return { kind: 'detail', screen, origin };
}

export function sheetRoute(screen, origin = mainRoute('home')) {
  return { kind: 'sheet', screen, origin };
}

export function flowRoute(screen) {
  return { kind: 'flow', screen };
}

const ANALYSIS_PARENT = {
  upload: mainRoute('home'),
  loading: mainRoute('home'),
  error_face: mainRoute('home'),
  error_network: mainRoute('home'),
  result_home: mainRoute('home'),
  hair_loading: analysisRoute('result_home'),
  result_tabs_hair: analysisRoute('result_home'),
  makeup_loading: analysisRoute('result_home'),
  result_tabs_makeup: analysisRoute('result_home'),
  // 합성 요청 중에는 시스템 back 을 무시한다. 화면의 취소 버튼은 명시적으로 상세로 이동한다.
  synth_loading: null,
};

const FLOW_PARENT = {}; // splash 는 뒤로 갈 곳이 없다

export function routeScreen(route) {
  return route?.kind === 'main' ? route.tab : route?.screen;
}

export function routeHasTabBar(route) {
  return route?.kind === 'main' && MAIN_TABS.includes(route.tab);
}

export function routeKey(route) {
  const screen = routeScreen(route) || 'unknown';
  return `${route?.kind || 'unknown'}:${screen}`;
}

export function routeForScreen(screen, origin = mainRoute('home')) {
  if (MAIN_TABS.includes(screen)) return mainRoute(screen);
  if (ANALYSIS_SCREENS.has(screen)) return analysisRoute(screen);
  if (DETAIL_SCREENS.has(screen)) return detailRoute(screen, origin);
  if (SHEET_SCREENS.has(screen)) return sheetRoute(screen, origin);
  if (FLOW_SCREENS.has(screen)) return flowRoute(screen);
  return mainRoute('home');
}

export function resolveBackRoute(route) {
  if (!route) return undefined;
  if (route.kind === 'detail' || route.kind === 'sheet') return route.origin || mainRoute('home');
  if (route.kind === 'main') return route.tab === 'home' ? undefined : mainRoute('home');
  if (route.kind === 'analysis') return ANALYSIS_PARENT[route.screen] || undefined;
  if (route.kind === 'flow') return FLOW_PARENT[route.screen] || undefined;
  return undefined;
}

// 라우트만 교체하고 result 등 앱 데이터는 그대로 둔다. 탭 전환이 분석 결과를 지우지 않는 계약이다.
export function transitionNavigation(appState, nextRoute) {
  return { ...appState, route: nextRoute };
}

export function isRequestRoute(route) {
  return ['loading', 'hair_loading', 'makeup_loading', 'synth_loading'].includes(routeScreen(route));
}
