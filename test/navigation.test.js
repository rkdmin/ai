import { describe, it, expect } from 'vitest';
import { PARENT_STAGE, resolveParentStage } from '../src/utils/navigation';

describe('resolveParentStage — 고정 복귀 지점', () => {
  it('맥락과 무관한 화면은 PARENT_STAGE 를 그대로 쓴다', () => {
    expect(resolveParentStage('personal_color')).toBe('upload');
    expect(resolveParentStage('card_detail')).toBe('result_tabs_hair');
    expect(resolveParentStage('makeup_detail')).toBe('result_tabs_makeup');
    expect(resolveParentStage('share_card_makeup')).toBe('makeup_detail');
    expect(resolveParentStage('trend')).toBe('home');
  });

  it('합성 로딩 중에는 뒤로가기를 무시한다 (복귀 지점 없음)', () => {
    expect(resolveParentStage('synth_loading')).toBeUndefined();
  });

  it('알 수 없는 stage 는 undefined', () => {
    expect(resolveParentStage('nope')).toBeUndefined();
  });
});

describe('resolveParentStage — share_card (회귀)', () => {
  // 하드웨어/브라우저 back 이 result_home 으로 튀어 카드 상세를 건너뛰던 버그.
  // ShareCard 의 onClose 와 같은 결과를 내야 한다.
  it('카드에서 연 공유는 카드 상세로 돌아간다', () => {
    expect(resolveParentStage('share_card', { activeCard: { rank: 1 } })).toBe('card_detail');
  });

  it('결과 화면에서 연 공유는 결과 화면으로 돌아간다', () => {
    expect(resolveParentStage('share_card', { activeCard: null })).toBe('result_home');
    expect(resolveParentStage('share_card')).toBe('result_home');
  });
});

describe('resolveParentStage — 진입 맥락에 따라 달라지는 화면', () => {
  it('history_detail 은 진입 출처로 복귀한다', () => {
    expect(resolveParentStage('history_detail', { historySelection: { back: 'home' } })).toBe('home');
    expect(resolveParentStage('history_detail', { historySelection: { back: 'history' } })).toBe('history');
  });

  it('history_detail 은 출처가 없으면 history 로 폴백한다', () => {
    expect(resolveParentStage('history_detail', {})).toBe('history');
    expect(resolveParentStage('history_detail', { historySelection: {} })).toBe('history');
  });

  it('ad_gate 는 adReturn.back 을 따른다', () => {
    expect(resolveParentStage('ad_gate', { adReturn: { back: 'result_tabs_makeup' } })).toBe('result_tabs_makeup');
  });

  it('ad_gate 는 adReturn 이 없으면 PARENT_STAGE 폴백', () => {
    expect(resolveParentStage('ad_gate', {})).toBe(PARENT_STAGE.ad_gate);
  });
});

describe('PARENT_STAGE 무결성', () => {
  it('모든 값이 자기 자신을 가리키지 않는다 (무한 루프 방지)', () => {
    for (const [stage, parent] of Object.entries(PARENT_STAGE)) {
      expect(parent).not.toBe(stage);
    }
  });

  it('뒤로가기를 따라가면 루트 화면에 도달한다', () => {
    // 루트는 두 개다. `home` 은 앱의 기본 화면이고,
    // `onboarding1` 은 첫 방문 흐름의 첫 화면이라 뒤로 갈 곳이 없다.
    const ROOTS = ['home', 'onboarding1'];
    for (const stage of Object.keys(PARENT_STAGE)) {
      let cur = stage;
      let hops = 0;
      while (cur && !ROOTS.includes(cur) && hops < 10) {
        cur = PARENT_STAGE[cur];
        hops += 1;
      }
      expect(ROOTS, `${stage} 에서 루트까지 못 감`).toContain(cur);
    }
  });
});
