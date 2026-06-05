/**
 * AnalysisResult CTA 위계 회귀 테스트 (Phase 4-4).
 * - 헤어=1차 / 메이크업=2차 CTA wiring
 * - 로그인 분석(analysisId)일 때만 SAVED 배지 노출
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalysisResult from '../src/components/AnalysisResult';

const baseResult = {
  faceType: '계란형',
  personalColor: '봄 웜톤',
  moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'],
  features: ['부드러운 눈매'],
};

describe('AnalysisResult CTA 위계', () => {
  it('헤어가 1차 CTA(START HERE)로 노출되고 클릭 시 onCardList("hair")', () => {
    const onCardList = vi.fn();
    render(<AnalysisResult result={baseResult} onCardList={onCardList} onShare={() => {}} />);

    expect(screen.getByText('1ST · START HERE')).toBeInTheDocument();
    fireEvent.click(screen.getByText('헤어 추천 보기'));
    expect(onCardList).toHaveBeenCalledWith('hair');
  });

  it('메이크업은 2차 CTA로 노출되고 클릭 시 onCardList("makeup")', () => {
    const onCardList = vi.fn();
    render(<AnalysisResult result={baseResult} onCardList={onCardList} onShare={() => {}} />);

    fireEvent.click(screen.getByText('메이크업 추천 보기'));
    expect(onCardList).toHaveBeenCalledWith('makeup');
  });

  it('로그인 분석(analysisId 있음)이면 SAVED 배지를 노출', () => {
    render(<AnalysisResult result={{ ...baseResult, analysisId: 'a-1' }} onCardList={() => {}} onShare={() => {}} />);
    expect(screen.getByText('이 분석은 히스토리에 저장됐어요')).toBeInTheDocument();
  });

  it('게스트 분석(analysisId 없음)이면 SAVED 배지를 노출하지 않음', () => {
    render(<AnalysisResult result={baseResult} onCardList={() => {}} onShare={() => {}} />);
    expect(screen.queryByText('이 분석은 히스토리에 저장됐어요')).toBeNull();
  });
});
