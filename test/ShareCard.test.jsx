/**
 * ShareCard 회귀 테스트 (Phase 4-8).
 * - synthesized photo 가 있으면 before/after 비교형으로 실제 이미지를 반영
 * - 없으면 결과 카드형(가짜 AFTER 없음)
 * - 저장(SAVE IMAGE)=1차 CTA, 외부 공유=2차. 중복 "이미지" 버튼 제거
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShareCard from '../src/components/ShareCard';

const result = { styleLabel: '봄날의 햇살형', faceType: '계란형', moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'] };
const card = { name: '쿠션 단발' };

describe('ShareCard — synthesized 반영', () => {
  it('합성 사진이 있으면 before/after 비교형으로 AFTER 이미지를 반영', () => {
    const synth = 'data:image/png;base64,AFTER';
    const { container } = render(
      <ShareCard variant="hair" result={result} card={card} photoUrl="data:image/png;base64,BEFORE" synthesizedPhoto={synth} onClose={() => {}} />,
    );

    expect(screen.getByText('BEFORE')).toBeInTheDocument();
    expect(screen.getByText('AFTER')).toBeInTheDocument();
    expect(container.querySelector(`img[src="${synth}"]`)).not.toBeNull();
  });

  it('합성 사진이 없으면 결과 카드형(REFERENCE)으로, 가짜 AFTER 없음', () => {
    render(
      <ShareCard variant="hair" result={result} card={card} photoUrl="data:image/png;base64,REF" synthesizedPhoto={null} onClose={() => {}} />,
    );

    expect(screen.getByText('REFERENCE')).toBeInTheDocument();
    expect(screen.queryByText('AFTER')).toBeNull();
  });
});

describe('ShareCard — CTA 위계', () => {
  it('SAVE IMAGE(1차) + 공유/링크 복사(2차)만, 중복 "이미지" 버튼 없음', () => {
    render(<ShareCard variant="hair" result={result} card={card} onClose={() => {}} />);

    expect(screen.getByText('SAVE IMAGE')).toBeInTheDocument();
    expect(screen.getByText('공유')).toBeInTheDocument();
    expect(screen.getByText('링크 복사')).toBeInTheDocument();
    expect(screen.queryByText('이미지')).toBeNull(); // 저장과 중복되던 2차 버튼 제거
  });
});
