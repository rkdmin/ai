import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('../src/api/ai.js', () => ({
  analyzeFace: vi.fn(),
  generateHairCards: vi.fn(),
  generateMakeupCards: vi.fn(),
  generateTotalCards: vi.fn(),
  generateAllCards: vi.fn(),
  generateStyledPhoto: vi.fn(),
  fetchHistory: vi.fn(() => Promise.resolve([])),
  fetchHistoryDetail: vi.fn(() => Promise.resolve(null)),
  saveHistoryCard: vi.fn(() => Promise.resolve({ ok: true })),
}));

const App = (await import('../src/App.jsx')).default;

beforeEach(() => {
  window.localStorage.clear();
  document.body.innerHTML = '';
});

describe('StatusBar 제거 가드', () => {
  it('어느 화면에서도 9:41 텍스트가 없다', () => {
    render(<App />);
    expect(document.body.innerHTML).not.toContain('9:41');
  });

  it('iOS 스타일 상태 아이콘 viewBox(17 11)가 렌더되지 않는다', () => {
    render(<App />);
    const svgs = document.querySelectorAll('svg');
    for (const svg of svgs) {
      expect(svg.getAttribute('viewBox')).not.toBe('0 0 17 11');
    }
  });
});

describe('첫 방문자 흐름', () => {
  it('로그인이나 온보딩을 강제하지 않고 splash에서 home으로 진입', async () => {
    vi.useFakeTimers();
    render(<App />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText('내 Beauty Mood 분석하기')).toBeInTheDocument();
    expect(screen.queryByText('STEP 01 · ANALYSIS')).not.toBeInTheDocument();
    expect(screen.queryByText('SIGN IN')).not.toBeInTheDocument();
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
    expect(screen.getByText('내 Beauty Mood 분석하기')).toBeInTheDocument();
    expect(screen.queryByText('STEP 01 · ANALYSIS')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
