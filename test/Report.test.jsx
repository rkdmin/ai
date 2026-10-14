/**
 * 통합 Beauty Report 화면 (plan 0009 F04).
 * - HAIR/MAKEUP 두 탭, 탭 전환은 onTab 콜백 (재생성 없음)
 * - locked 면 본문 대신 구매 안내, partial_failed 면 실패한 탭만 재시도 버튼
 * - 상세는 리포트 본문 필드를 그대로 펼친다 (미용실 문장, 적용 순서, 제형)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Report from '../src/components/Report';
import ReportHairDetail from '../src/components/ReportHairDetail';
import ReportMakeupDetail from '../src/components/ReportMakeupDetail';
import sample from '../src/data/sample-report.json';

describe('Report 탭', () => {
  it('HAIR 탭은 방향·기장·추천 3·미용실 가이드를 보여주고 MAKEUP 탭 클릭은 onTab("makeup")', () => {
    const onTab = vi.fn();
    render(<Report report={sample} tab="hair" onTab={onTab} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByTestId('report-hair')).toBeInTheDocument();
    expect(screen.getByText('쇄골 아래 미디엄')).toBeInTheDocument();
    expect(screen.getAllByText('자세히 보기')).toHaveLength(3);
    expect(screen.getByText(/길이는 쇄골 아래 미디엄/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'MAKEUP' }));
    expect(onTab).toHaveBeenCalledWith('makeup');
  });

  it('MAKEUP 탭은 근거 부위와 룩 3개를 보여주고 자세히 보기는 onOpenLook 에 룩을 넘긴다', () => {
    const onOpenLook = vi.fn();
    render(<Report report={sample} tab="makeup" onTab={() => {}} onOpenLook={onOpenLook} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByTestId('report-makeup')).toBeInTheDocument();
    expect(screen.getByText('근거 · 아몬드 눈')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('자세히 보기')[0]);
    expect(onOpenLook).toHaveBeenCalledWith(expect.objectContaining({ rank: 1, mood: '소프트 글로우' }));
  });

  it('locked 면 본문 대신 구매 안내를 보여준다', () => {
    const onUnlock = vi.fn();
    render(<Report report={{ ...sample, locked: true, hair: null, makeup: null }} tab="hair" onUnlock={onUnlock} onBack={() => {}} onShare={() => {}} />);
    expect(screen.queryByTestId('report-hair')).toBeNull();
    fireEvent.click(screen.getByText('Beauty Report 구매하기'));
    expect(onUnlock).toHaveBeenCalled();
  });

  it('partial_failed 면 실패한 탭에만 재시도 버튼이 뜨고 성공한 탭은 그대로다', () => {
    const onRetry = vi.fn();
    const partial = { ...sample, status: 'partial_failed', makeup: null, makeupError: 'overloaded' };
    const { rerender } = render(<Report report={partial} tab="makeup" onRetry={onRetry} onBack={() => {}} onShare={() => {}} />);
    fireEvent.click(screen.getByText('이 탭만 다시 만들기'));
    expect(onRetry).toHaveBeenCalled();
    rerender(<Report report={partial} tab="hair" onRetry={onRetry} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByTestId('report-hair')).toBeInTheDocument();
  });
});

describe('리포트 상세', () => {
  it('헤어 상세는 미용실 문장·대안·스타일링 노트를 펼치고 TRY ON 은 스타일을 넘긴다', () => {
    const onTryOn = vi.fn();
    const style = sample.hair.styles[0];
    render(<ReportHairDetail style={style} analysis={sample.analysis} onTryOn={onTryOn} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByText(/쇄골 아래 길이로 맞추고/)).toBeInTheDocument();
    expect(screen.getByText('C컬 미디엄')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/TRY ON/));
    expect(onTryOn).toHaveBeenCalledWith(style);
  });

  it('메이크업 상세는 부위별 가이드·적용 순서·제형을 보여주고 제품 버튼은 onProducts 가 있을 때만', () => {
    const look = sample.makeup.looks[0];
    const { rerender } = render(<ReportMakeupDetail look={look} analysis={sample.analysis} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByText('턱선 아래 넓게 흐리듯')).toBeInTheDocument();
    expect(screen.getByText('적용 순서')).toBeInTheDocument();
    expect(screen.getByText('크림 블러셔')).toBeInTheDocument();
    expect(screen.queryByText(/관련 제품 둘러보기/)).toBeNull();
    rerender(<ReportMakeupDetail look={look} analysis={sample.analysis} onProducts={() => {}} onBack={() => {}} onShare={() => {}} />);
    expect(screen.getByText(/관련 제품 둘러보기/)).toBeInTheDocument();
  });
});
