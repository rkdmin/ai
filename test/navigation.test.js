import { describe, expect, it } from 'vitest';
import {
  MAIN_TABS,
  analysisRoute,
  detailRoute,
  flowRoute,
  mainRoute,
  resolveBackRoute,
  routeForScreen,
  routeHasTabBar,
  routeScreen,
  sheetRoute,
  transitionNavigation,
} from '../src/utils/navigation';

describe('F01 route 역할 분리', () => {
  it('메인 탭·분석·상세·시트를 서로 다른 route kind로 만든다', () => {
    expect(MAIN_TABS).toEqual(['home', 'style', 'chemistry', 'my']);
    expect(routeForScreen('home')).toEqual({ kind: 'main', tab: 'home' });
    expect(routeForScreen('upload')).toEqual({ kind: 'analysis', screen: 'upload' });
    expect(routeForScreen('card_detail')).toMatchObject({ kind: 'detail', screen: 'card_detail' });
    expect(routeForScreen('share_card')).toMatchObject({ kind: 'sheet', screen: 'share_card' });
    expect(routeForScreen('splash')).toEqual({ kind: 'flow', screen: 'splash' });
    // 온보딩·독립 로그인·광고 게이트는 흐름에서 뺐다 (ADR 0010) — 모르는 화면은 홈으로
    expect(routeForScreen('login')).toEqual({ kind: 'main', tab: 'home' });
    expect(routeForScreen('ad_gate')).toEqual({ kind: 'main', tab: 'home' });
  });

  it('하단 탭은 네 개의 main route에서만 노출한다', () => {
    for (const tab of MAIN_TABS) expect(routeHasTabBar(mainRoute(tab))).toBe(true);
    expect(routeHasTabBar(analysisRoute('result_home'))).toBe(false);
    expect(routeHasTabBar(detailRoute('card_detail'))).toBe(false);
    expect(routeHasTabBar(sheetRoute('share_card'))).toBe(false);
    expect(routeHasTabBar(flowRoute('splash'))).toBe(false);
  });
});

describe('F01 origin 기반 뒤로가기', () => {
  it('상세와 시트는 버튼·브라우저·Android가 함께 쓰는 origin으로 복귀한다', () => {
    const home = mainRoute('home');
    const history = detailRoute('history', home);
    const historyItem = detailRoute('history_detail', history);
    const share = sheetRoute('share_card', historyItem);

    expect(resolveBackRoute(share)).toEqual(historyItem);
    expect(resolveBackRoute(historyItem)).toEqual(history);
    expect(resolveBackRoute(history)).toEqual(home);
  });

  it('분석 단계의 고정 복귀와 합성 중 back 무시를 유지한다', () => {
    // 퍼스널컬러 단계는 흐름에서 뺐다 (ADR 0010 R13) — upload 는 홈으로 돌아간다
    expect(resolveBackRoute(analysisRoute('upload'))).toEqual(mainRoute('home'));
    expect(resolveBackRoute(analysisRoute('personal_color'))).toBeUndefined();
    expect(resolveBackRoute(analysisRoute('result_home'))).toEqual(mainRoute('home'));
    expect(resolveBackRoute(analysisRoute('synth_loading'))).toBeUndefined();
  });
});

describe('F01 탭 전환 상태 보존', () => {
  it('main tab을 바꿔도 현재 분석 결과를 초기화하지 않는다', () => {
    const result = { analysisId: 'analysis-1', faceType: '계란형' };
    const current = { route: mainRoute('home'), result, anotherState: { cards: 4 } };
    const next = transitionNavigation(current, mainRoute('style'));

    expect(routeScreen(next.route)).toBe('style');
    expect(next.result).toBe(result);
    expect(next.anotherState).toBe(current.anotherState);
  });
});
