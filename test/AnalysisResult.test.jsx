/**
 * AnalysisResult 회귀 테스트.
 * - CTA 위계 (Phase 4-4): 헤어=1차 / 메이크업=2차 wiring
 * - 로그인 분석(analysisId)일 때만 SAVED 배지 노출
 * - features 는 백엔드가 얼굴형과 모순되는 항목을 걸러 0~3개로 보낸다.
 *   비었다고 더미로 메우면 분석하지 않은 특징을 진짜처럼 보여주게 된다.
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

describe('AnalysisResult features 렌더', () => {
  const render1 = (features) =>
    render(<AnalysisResult result={{ ...baseResult, features }} onCardList={() => {}} onShare={() => {}} />);

  it('features 개수에 맞춰 제목이 바뀐다', () => {
    render1(['무쌍', '입술 두꺼움', '코 낮음']);
    expect(screen.getByText('TOP 3 FEATURES')).toBeInTheDocument();
  });

  it('1개만 남아도 그 1개만 보여준다 (더미로 채우지 않음)', () => {
    render1(['눈꼬리 처짐']);
    expect(screen.getByText('TOP 1 FEATURES')).toBeInTheDocument();
    expect(screen.getByText('눈꼬리 처짐')).toBeInTheDocument();
    expect(screen.queryByText('균형잡힌 비율')).toBeNull();
    expect(screen.queryByText('입체적인 골격')).toBeNull();
  });

  it('0개면 하드코딩 특징 대신 균형 잡힌 얼굴이라는 안내를 보여준다', () => {
    render1([]);
    expect(screen.getByText('FEATURES')).toBeInTheDocument();
    expect(screen.getByText('뚜렷하게 두드러지는 특징 없이 전체적으로 균형 잡힌 얼굴이에요.')).toBeInTheDocument();
    expect(screen.queryByText('부드러운 눈매')).toBeNull();
  });
});
