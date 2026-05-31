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
