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

describe('AnalysisResult 무드 렌더', () => {
  it('moodArchetype 3개를 모두 보여준다', () => {
    render(<AnalysisResult result={baseResult} onCardList={() => {}} onShare={() => {}} />);

    expect(screen.getByText('로맨틱')).toBeInTheDocument();
    expect(screen.getByText('클린')).toBeInTheDocument();
    expect(screen.getByText('소프트')).toBeInTheDocument();
  });

  it('새 필드가 있으면 제목·Primary/Traits·설명·근거·포인트·방향을 표시하고 primary를 무드 첫 순서로 둔다', () => {
    const result = {
      ...baseResult,
      moodArchetype: ['CLEAN', 'SOFT', 'ELEGANT'],
      primaryMood: 'SOFT',
      traits: ['곡선 윤곽', '저대비'],
      moodTitle: '차분하고 부드러운 이미지',
      moodSummary: '완만한 윤곽과 낮은 대비가 보여요.',
      moodEvidence: ['곡선 윤곽', '저대비', '아몬드 눈'],
      distinctivePoint: '눈매가 또렷한 편이에요.',
      hairDirection: '부드러운 레이어',
      makeupDirection: '낮은 대비의 음영',
    };
    render(<AnalysisResult result={result} onCardList={() => {}} onShare={() => {}} />);

    expect(screen.getByText('차분하고 부드러운 이미지')).toBeInTheDocument();
    expect(screen.getByText('Primary · SOFT · 곡선 윤곽 · 저대비')).toBeInTheDocument();
    expect(screen.getByText('완만한 윤곽과 낮은 대비가 보여요.')).toBeInTheDocument();
    expect(screen.getByText('눈매가 또렷한 편이에요.')).toBeInTheDocument();
    expect(screen.getByText('헤어 · 부드러운 레이어')).toBeInTheDocument();
    expect(screen.getByText('메이크업 · 낮은 대비의 음영')).toBeInTheDocument();
    const moodChips = screen.getByLabelText('Beauty Mood').children;
    expect([...moodChips].map((node) => node.textContent)).toEqual(['소프트', '클린', '엘레강트']);
    expect(screen.getByLabelText('무드 근거').children).toHaveLength(3);
  });

  it('새 필드가 없으면 명시된 제목·설명 fallback만 쓰고 선택 필드 영역은 숨긴다', () => {
    render(<AnalysisResult result={baseResult} onCardList={() => {}} onShare={() => {}} />);

    expect(screen.getByRole('heading', { name: '나의 Beauty Mood' })).toBeInTheDocument();
    expect(screen.getByText('대표 무드의 분위기를 중심으로 추천을 준비했어요.')).toBeInTheDocument();
    expect(screen.queryByText(/^Primary ·/)).toBeNull();
    expect(screen.queryByText('MOOD EVIDENCE')).toBeNull();
    expect(screen.queryByText('MY DISTINCTIVE POINT')).toBeNull();
    expect(screen.queryByText(/^헤어 ·/)).toBeNull();
    expect(screen.queryByText(/^메이크업 ·/)).toBeNull();
  });

  it('legacy 저장본은 D01 블록을 숨기고 없는 값을 지어내지 않는다', () => {
    render(<AnalysisResult result={{ ...baseResult, legacy: true }} onCardList={() => {}} onShare={() => {}} />);

    expect(screen.queryByTestId('mood-profile')).toBeNull();
    expect(screen.queryByTestId('mood-profile-details')).toBeNull();
    expect(screen.queryByText('나의 Beauty Mood')).toBeNull();
    expect(screen.queryByText('대표 무드의 분위기를 중심으로 추천을 준비했어요.')).toBeNull();
    expect(screen.getByTestId('legacy-moods')).toBeInTheDocument();
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
