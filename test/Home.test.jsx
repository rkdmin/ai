import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Home from '../src/components/Home';
import { fetchHistory } from '../src/api/ai';

vi.mock('../src/api/ai', () => ({
  fetchHistory: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Home', () => {
  it('does not fetch history for guests', () => {
    render(<Home onNext={() => {}} onNav={() => {}} canAccessHistory={false} />);

    expect(fetchHistory).not.toHaveBeenCalled();
    expect(screen.getByText('RECENT HISTORY')).toBeInTheDocument();
  });

  it('기기에 복원된 새 Beauty Profile 필드를 표시하고 legacy 블록은 숨긴다', () => {
    const profile = {
      schemaVersion: 3, moodTitle: '차분한 이미지', moodSummary: '낮은 대비가 보여요.',
      primaryMood: 'SOFT', traits: ['곡선 윤곽'], moodEvidence: ['저대비'],
      distinctivePoint: '또렷한 눈매', hairDirection: '부드러운 레이어', makeupDirection: '은은한 음영',
      moodArchetype: ['CLEAN', 'SOFT', 'ELEGANT'],
    };
    const { rerender } = render(<Home profile={profile} onNext={() => {}} onNav={() => {}} />);
    expect(screen.getByText('차분한 이미지')).toBeInTheDocument();
    expect(screen.getByText('낮은 대비가 보여요.')).toBeInTheDocument();
    expect(screen.getByText('Primary · SOFT · 곡선 윤곽')).toBeInTheDocument();
    expect(screen.getByText('또렷한 눈매')).toBeInTheDocument();
    expect(screen.getByText('헤어 · 부드러운 레이어')).toBeInTheDocument();

    rerender(<Home profile={{ schemaVersion: 1, legacy: true, faceType: '계란형' }} onNext={() => {}} onNav={() => {}} />);
    expect(screen.queryByTestId('mood-profile-summary')).toBeNull();
    expect(screen.queryByText('차분한 이미지')).toBeNull();
  });

  it('fetches recent history for authenticated users and opens detail', async () => {
    fetchHistory.mockResolvedValue([
      {
        analysisId: 'analysis-10',
        faceType: '계란형',
        personalColor: 'spring_warm',
        createdAt: '2026-05-12T00:00:00+00:00',
        photoExpired: false,
      },
    ]);
    const onOpenRecent = vi.fn();

    render(<Home onNext={() => {}} onNav={() => {}} onOpenRecent={onOpenRecent} canAccessHistory />);

    await waitFor(() => expect(fetchHistory).toHaveBeenCalledWith(3));
    fireEvent.click(await screen.findByText('계란형 · spring_warm'));

    expect(onOpenRecent).toHaveBeenCalledWith('analysis-10');
  });
});
