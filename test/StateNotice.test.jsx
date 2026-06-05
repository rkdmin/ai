/**
 * StateNotice 단위 테스트.
 * empty / error / loading 상태 블록의 구조·톤 통일을 회귀로 고정한다.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StateNotice } from '../src/components/common/StateNotice';

describe('StateNotice', () => {
  it('eyebrow 라벨과 본문을 함께 렌더한다', () => {
    render(<StateNotice variant="loading" eyebrow="LOADING" message="기록을 불러오는 중이에요" />);
    expect(screen.getByText('LOADING')).toBeInTheDocument();
    expect(screen.getByText('기록을 불러오는 중이에요')).toBeInTheDocument();
  });

  it('error variant 의 eyebrow 는 경고색(#c45a3b)을 쓴다', () => {
    render(<StateNotice variant="error" eyebrow="LOAD FAILED" message="불러오지 못했어요." />);
    const eyebrow = screen.getByText('LOAD FAILED');
    expect(eyebrow).toHaveStyle({ color: '#c45a3b' });
  });

  it('loading variant 의 eyebrow 는 회색(#7a7a7a)을 쓴다', () => {
    render(<StateNotice variant="loading" eyebrow="LOADING" message="불러오는 중이에요" />);
    expect(screen.getByText('LOADING')).toHaveStyle({ color: '#7a7a7a' });
  });

  it('message 로 노드(<br/> 포함)를 받을 수 있다', () => {
    render(
      <StateNotice
        variant="empty"
        icon
        eyebrow="NO CARDS YET"
        message={<>헤어 카드를 불러오지 못했어요.<br />뒤로 가서 다시 시도해 주세요.</>}
      />,
    );
    expect(screen.getByText(/헤어 카드를 불러오지 못했어요/)).toBeInTheDocument();
    expect(screen.getByText(/다시 시도해 주세요/)).toBeInTheDocument();
  });
});
