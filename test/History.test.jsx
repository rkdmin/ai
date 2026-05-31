import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import History from '../src/components/History';
import { fetchHistory } from '../src/api/ai';

vi.mock('../src/api/ai', () => ({
  fetchHistory: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('History', () => {
  it('loads recent history from the backend and renders saved card types', async () => {
    fetchHistory.mockResolvedValue([
      {
        analysisId: 'analysis-1',
        faceType: '계란형',
        personalColor: 'spring_warm',
        cardTypes: ['hair', 'makeup'],
        createdAt: '2026-05-11T00:00:00+00:00',
        photoExpired: false,
      },
    ]);

    render(<History onNav={() => {}} onBack={() => {}} />);

    expect(screen.getByText('기록을 불러오는 중이에요')).toBeInTheDocument();
    await waitFor(() => expect(fetchHistory).toHaveBeenCalledWith(5));
    expect(await screen.findByText('계란형 · hair · makeup')).toBeInTheDocument();
    expect(screen.getByText('계란형 · spring_warm')).toBeInTheDocument();
    expect(screen.getByText('2026 · 05 · 11')).toBeInTheDocument();
  });

  it('shows photo expiration copy for expired history rows', async () => {
    fetchHistory.mockResolvedValue([
      {
        analysisId: 'analysis-2',
        faceType: '하트형',
        personalColor: null,
        cardTypes: [],
        createdAt: '2026-05-10T00:00:00+00:00',
        photoExpired: true,
      },
    ]);

    render(<History onNav={() => {}} onBack={() => {}} />);

    expect(await screen.findByText('하트형 · 분석 완료')).toBeInTheDocument();
    expect(screen.getAllByText('사진이 만료되었어요.').length).toBeGreaterThan(0);
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
  });

  it('renders a backend error state instead of stale mock data', async () => {
    fetchHistory.mockRejectedValue(new Error('로그인이 필요합니다'));

    render(<History onNav={() => {}} onBack={() => {}} />);

    expect(await screen.findByText('LOAD FAILED')).toBeInTheDocument();
    expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
  });

  it('opens detail and new analysis callbacks from the screen', async () => {
    fetchHistory.mockResolvedValue([
      {
        analysisId: 'analysis-3',
        faceType: '둥근형',
        personalColor: 'autumn_warm',
        cardTypes: ['hair'],
        createdAt: '2026-05-09T00:00:00+00:00',
        photoExpired: false,
      },
    ]);
    const onOpenDetail = vi.fn();
    const onNewAnalysis = vi.fn();

    render(<History onNav={() => {}} onBack={() => {}} onOpenDetail={onOpenDetail} onNewAnalysis={onNewAnalysis} />);

    fireEvent.click(await screen.findByText('둥근형 · hair'));
    expect(onOpenDetail).toHaveBeenCalledWith('analysis-3');

    fireEvent.click(screen.getByText('NEW ANALYSIS'));
    expect(onNewAnalysis).toHaveBeenCalledTimes(1);
  });
});
