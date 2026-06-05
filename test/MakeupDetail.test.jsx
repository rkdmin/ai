/**
 * MakeupDetail 회귀 테스트 (Phase 4-5).
 * - test.md 규칙 6: 메이크업 카드에 사진 생성/합성 CTA 가 다시 노출되지 않아야 한다.
 * - 실제 coupangPartnersUrl 이 없으면 가격/링크/제휴 고지 대신 "검색 키워드" 로 정직하게 표시.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MakeupDetail from '../src/components/MakeupDetail';

describe('MakeupDetail — 사진 생성 CTA 미노출 (정책 회귀)', () => {
  it('하단 CTA 는 OTHER LOOKS / SHARE LOOK 뿐, dead "더보기"·합성 버튼 없음', () => {
    const onSynthesize = vi.fn();
    render(<MakeupDetail card={{ name: '코랄 글로우 룩', rank: 1 }} onBack={() => {}} onShare={() => {}} onSynthesize={onSynthesize} />);

    expect(screen.getByText('OTHER LOOKS')).toBeInTheDocument();
    expect(screen.getByText('SHARE LOOK')).toBeInTheDocument();
    // onSynthesize 에 잘못 연결됐던 "+ 더보기" dead 버튼이 제거되어야 한다.
    expect(screen.queryByText(/더보기/)).toBeNull();
  });

  it('SHARE LOOK 클릭 시 onShare, OTHER LOOKS 클릭 시 onBack', () => {
    const onShare = vi.fn();
    const onBack = vi.fn();
    render(<MakeupDetail card={{ name: '룩', rank: 1 }} onBack={onBack} onShare={onShare} onSynthesize={() => {}} />);

    fireEvent.click(screen.getByText('SHARE LOOK'));
    expect(onShare).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('OTHER LOOKS'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('MakeupDetail — 제품 블록 정직성', () => {
  it('쿠팡 링크가 없으면 검색 키워드로 표시하고 제휴 고지/구매 링크 미노출', () => {
    render(
      <MakeupDetail
        card={{
          name: '룩',
          rank: 1,
          recommendedProducts: [{ slot: 'lip', label: '코랄 립', searchKeyword: '봄웜 코랄 립틴트' }],
        }}
        onBack={() => {}}
        onShare={() => {}}
        onSynthesize={() => {}}
      />,
    );

    expect(screen.getByText(/검색 키워드/)).toBeInTheDocument();
    expect(screen.queryByText(/쿠팡파트너스 활동/)).toBeNull();
    expect(screen.queryByText(/쿠팡에서 보기/)).toBeNull();
  });

  it('쿠팡 링크가 있으면 구매 링크 + 제휴 고지 노출', () => {
    render(
      <MakeupDetail
        card={{
          name: '룩',
          rank: 1,
          recommendedProducts: [
            { slot: 'lip', label: '코랄 립', searchKeyword: '코랄', coupangPartnersUrl: 'https://link.coupang.com/x' },
          ],
        }}
        onBack={() => {}}
        onShare={() => {}}
        onSynthesize={() => {}}
      />,
    );

    expect(screen.getByText(/쿠팡에서 보기/)).toBeInTheDocument();
    expect(screen.getByText(/쿠팡파트너스 활동/)).toBeInTheDocument();
  });
});
