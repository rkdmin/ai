/**
 * CardDetail 하단 sticky CTA 조건 분기 회귀 테스트 (Phase 4-5).
 * - 합성 전: 합성 보기(1차) + SHARE(2차)
 * - 합성 후: 결과 공유(1차) + 다시 보기(2차) — 1차 행동이 공유로 전환
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardDetail from '../src/components/CardDetail';

const card = { name: '쿠션 단발', rank: 1 };

describe('CardDetail sticky CTA 조건 분기', () => {
  it('합성 전: 합성 보기(1차)·SHARE(2차)만 노출, 콜백 연결', () => {
    const onShare = vi.fn();
    const onSynthesize = vi.fn();
    render(
      <CardDetail card={card} synthesizedPhoto={null} onBack={() => {}} onShare={onShare} onSynthesize={onSynthesize} />,
    );

    expect(screen.getByText('합성 보기')).toBeInTheDocument();
    expect(screen.queryByText('결과 공유')).toBeNull();
    expect(screen.queryByText('다시 보기')).toBeNull();

    fireEvent.click(screen.getByText('합성 보기'));
    expect(onSynthesize).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('SHARE'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('합성 후: 결과 공유(1차)·다시 보기(2차)로 전환, 콜백 연결', () => {
    const onShare = vi.fn();
    const onSynthesize = vi.fn();
    render(
      <CardDetail
        card={card}
        synthesizedPhoto="data:image/png;base64,AAAA"
        onBack={() => {}}
        onShare={onShare}
        onSynthesize={onSynthesize}
      />,
    );

    expect(screen.getByText('결과 공유')).toBeInTheDocument();
    expect(screen.getByText('다시 보기')).toBeInTheDocument();
    expect(screen.queryByText('합성 보기')).toBeNull();

    fireEvent.click(screen.getByText('결과 공유'));
    expect(onShare).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('다시 보기'));
    expect(onSynthesize).toHaveBeenCalledTimes(1);
  });
});
