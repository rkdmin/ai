/**
 * CardList 단위 테스트.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardList from '../src/components/CardList';
import { mapHairCard } from '../src/api/mappers';

describe('CardList', () => {
  it('빈 cards 면 NO CARDS YET 빈 상태 표시', () => {
    render(<CardList type="hair" cards={[]} onBack={() => {}} onCard={() => {}} />);
    expect(screen.getByText('NO CARDS YET')).toBeInTheDocument();
  });

  it('null cards 도 빈 상태로 처리 (mock fallback 회귀 방지)', () => {
    render(<CardList type="makeup" cards={null} onBack={() => {}} onCard={() => {}} />);
    expect(screen.getByText('NO CARDS YET')).toBeInTheDocument();
  });

  it('정규화된 카드 배열을 받아서 카드 이름과 sub 를 표시', () => {
    const onCard = vi.fn();
    const cards = [
      mapHairCard({
        type: 'recommend', rank: 1, cardType: 'hair',
        mood: 'CLEAN', moodLabel: 'CLEAN · 단정',
        hair: '쿠션 단발', bangs: '시스루뱅',
        hairReason: '잘 어울려요',
        coachComment: 'AI 코멘트',
      }),
      mapHairCard({
        type: 'avoid', cardType: 'hair',
        hair: '원랭스 롱',
        hairReason: '얼굴이 더 길어 보일 수 있어요',
        coachComment: '권장 안 함',
      }),
    ];
    render(<CardList type="hair" cards={cards} onBack={() => {}} onCard={onCard} />);

    expect(screen.getByText('쿠션 단발')).toBeInTheDocument();
    expect(screen.getByText('시스루뱅 · CLEAN · 단정')).toBeInTheDocument();
    expect(screen.getByText('원랭스 롱')).toBeInTheDocument();
    expect(screen.getByText('AVOID')).toBeInTheDocument();

    // 클릭 시 onCard 콜백.
    fireEvent.click(screen.getByText('쿠션 단발'));
    expect(onCard).toHaveBeenCalledTimes(1);
    expect(onCard.mock.calls[0][0].name).toBe('쿠션 단발');
  });
});
