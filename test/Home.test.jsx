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

  it('기기에 복원된 Beauty Profile을 표시하고 legacy에는 없는 무드를 채우지 않는다', () => {
    const { rerender } = render(<Home profile={{ schemaVersion: 3, moodTitle: '차분한 이미지', moodSummary: '낮은 대비가 보여요.' }} onNext={() => {}} onNav={() => {}} />);
    expect(screen.getByText('차분한 이미지')).toBeInTheDocument();
    expect(screen.getByText('낮은 대비가 보여요.')).toBeInTheDocument();

    rerender(<Home profile={{ schemaVersion: 1, legacy: true, faceType: '계란형' }} onNext={() => {}} onNav={() => {}} />);
    expect(screen.getByText('계란형')).toBeInTheDocument();
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
