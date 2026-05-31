import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HistoryDetail from '../src/components/HistoryDetail';
import { fetchHistoryDetail } from '../src/api/ai';

vi.mock('../src/api/ai', () => ({
  fetchHistoryDetail: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HistoryDetail', () => {
  it('reopens saved hair cards with analysisId restored', async () => {
    fetchHistoryDetail.mockResolvedValue({
      analysis: {
        analysisId: 'analysis-42',
        faceType: '계란형',
        personalColor: 'spring_warm',
        features: ['광대가 도드라짐'],
        createdAt: '2026-05-12T00:00:00+00:00',
      },
      cards: [[
        {
          type: 'recommend',
          rank: 1,
          cardType: 'hair',
          mood: 'CLEAN',
          moodLabel: 'CLEAN · 정돈된 분위기',
          hair: '레이어드',
          bangs: '시스루',
          hairReason: '부드러운 인상을 살립니다',
          featureTip: '광대 라인이 자연스럽게 정리됩니다',
          coachComment: '잘 맞는 스타일입니다',
        },
      ]],
      generatedPhotos: [],
    });
    const onOpenCards = vi.fn();

    render(<HistoryDetail analysisId="analysis-42" onBack={() => {}} onOpenCards={onOpenCards} onNewAnalysis={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: /OPEN/i }));

    await waitFor(() => expect(onOpenCards).toHaveBeenCalledTimes(1));
    const [, cards, analysis] = onOpenCards.mock.calls[0];
    expect(analysis.analysisId).toBe('analysis-42');
    expect(cards[0].analysisId).toBe('analysis-42');
    expect(cards[0].cardType).toBe('hair');
  });
});
