/**
 * App 라우팅 흐름 테스트.
 *
 * 1. 모든 화면에 시간/와이파이/배터리 mock chrome 텍스트가 없다 (StatusBar 제거 회귀 가드).
 * 2. 첫 방문자: splash → onboarding → login → home, localStorage 플래그 set.
 * 3. 재방문자(localStorage 플래그): splash → home 직행.
 *
 * 분석/카드 흐름은 별도 테스트(Loading.test.jsx, CardList.test.jsx)에서 컴포넌트 단위로 검증.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// 분석 호출이 실수로 일어나지 않도록 stub.
vi.mock('../src/api/ai.js', () => ({
  analyzeFace: vi.fn(),
  generateHairCards: vi.fn(),
  generateMakeupCards: vi.fn(),
  generateTotalCards: vi.fn(),
  generateAllCards: vi.fn(),
  generateStyledPhoto: vi.fn(),
}));

const App = (await import('../src/App.jsx')).default;

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = '';
});

describe('StatusBar 회귀 가드 — mock chrome 제거', () => {
  it('어떤 화면에도 9:41 텍스트가 없다', () => {
    render(<App />);
    expect(document.body.innerHTML).not.toContain('9:41');
  });

  it('iOS-style 시그널 아이콘 viewBox(17 11) 가 어디에도 렌더되지 않는다', () => {
    render(<App />);
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).not.toBe('0 0 17 11');
    }
  });
});

describe('첫 방문자 흐름', () => {
  it('splash → onboarding → login → home, 그리고 localStorage 플래그 set', async () => {
    vi.useFakeTimers();
    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(1000); // splash 자동 진행 (0.9s)
    });
    expect(screen.getByText('STEP 01 · ANALYSIS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));
    expect(screen.getByText('STEP 02 · CARDS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'NEXT' }));
    expect(screen.getByText('STEP 03 · PRODUCTS')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'GET STARTED' }));
    expect(screen.getByText('SIGN IN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }));
    expect(screen.getByText('START ANALYSIS')).toBeInTheDocument();

    expect(window.localStorage.getItem('beaumi.onboarded')).toBe('1');

    vi.useRealTimers();
  });
});

describe('재방문자 흐름', () => {
  it('localStorage 플래그가 있으면 splash 후 home 으로 직행', async () => {
    window.localStorage.setItem('beaumi.onboarded', '1');
    vi.useFakeTimers();
    render(<App />);
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('START ANALYSIS')).toBeInTheDocument();
    expect(screen.queryByText('STEP 01 · ANALYSIS')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
