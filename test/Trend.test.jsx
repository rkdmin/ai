/**
 * Trend 준비중 경량화 회귀 테스트 (Phase 4-6).
 * - mock 피드/가짜 saves 수치/dead search 버튼/필터칩이 제거되어야 한다.
 * - coming soon 안내 + START ANALYSIS(→ home) CTA 만 남는다.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Trend from '../src/components/Trend';

describe('Trend — 준비중 경량화', () => {
  it('coming soon 안내가 노출되고 mock 흔적(saves)·search 버튼이 없다', () => {
    render(<Trend onNav={() => {}} />);

    expect(screen.getByText('coming soon')).toBeInTheDocument();
    expect(screen.queryByText(/saves/)).toBeNull(); // 가짜 인기 수치 제거
    expect(screen.queryByLabelText('search')).toBeNull(); // dead search 버튼 제거
  });

  it('START ANALYSIS 클릭 시 onNav("home")', () => {
    const onNav = vi.fn();
    render(<Trend onNav={onNav} />);

    fireEvent.click(screen.getByText('START ANALYSIS'));
    expect(onNav).toHaveBeenCalledWith('home');
  });
});
