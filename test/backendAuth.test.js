import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('backend API auth/history wiring', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('adds Supabase Bearer token and sends personalColor on analyze', async () => {
    vi.doMock('../src/utils/authBridge', () => ({
      getAccessToken: () => 'token-123',
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ faceType: '계란형', features: [], moodArchetype: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { analyzeFace } = await import('../src/api/backend.js');
    await analyzeFace('data:image/jpeg;base64,xxx', 'spring_warm');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'content-type': 'application/json',
        }),
        body: JSON.stringify({ frontImage: 'data:image/jpeg;base64,xxx', personalColor: 'spring_warm' }),
      }),
    );
  });

  it('validatePhoto posts only the image to the validation endpoint', async () => {
    vi.doMock('../src/utils/authBridge', () => ({ getAccessToken: () => null }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, code: null, checks: {}, faceCount: 1 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { validatePhoto } = await import('../src/api/backend.js');
    await validatePhoto('data:image/jpeg;base64,photo');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/photos/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ image: 'data:image/jpeg;base64,photo' }),
      }),
    );
    expect(fetchMock.mock.calls[0][1].body).not.toContain('personalColor');
  });

  it('parseError keeps the response code on the thrown error', async () => {
    vi.doMock('../src/utils/authBridge', () => ({ getAccessToken: () => null }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: '얼굴이 여러 개 보여요.', code: 'MULTIPLE_FACES' }),
    }));

    const { analyzeFace } = await import('../src/api/backend.js');
    await expect(analyzeFace('image')).rejects.toMatchObject({
      message: '얼굴이 여러 개 보여요.',
      status: 400,
      code: 'MULTIPLE_FACES',
    });
  });

  it('fetchHistory uses GET with Authorization header', async () => {
    vi.doMock('../src/utils/authBridge', () => ({
      getAccessToken: () => 'token-abc',
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { fetchHistory } = await import('../src/api/backend.js');
    await fetchHistory(5);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/history?limit=5',
      { headers: { Authorization: 'Bearer token-abc' } },
    );
  });

  it('saveHistoryCard posts the agreed Phase 3 payload', async () => {
    vi.doMock('../src/utils/authBridge', () => ({
      getAccessToken: () => 'token-save',
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { saveHistoryCard } = await import('../src/api/backend.js');
    await saveHistoryCard('analysis-1', 'hair', [{ name: '레이어드' }]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/history',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-save' }),
        body: JSON.stringify({
          analysisId: 'analysis-1',
          cardType: 'hair',
          cardData: [{ name: '레이어드' }],
        }),
      }),
    );
  });
});
