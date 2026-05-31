import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('authBridge', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it('clears stale return target when guest mode starts', async () => {
    const { setPostAuthTarget, startGuestMode } = await import('../src/utils/authBridge.js');

    setPostAuthTarget({ kind: 'tab', stage: 'history' });
    startGuestMode();

    expect(window.localStorage.getItem('beaumi.auth.return_target')).toBeNull();
    expect(window.localStorage.getItem('beaumi.guest.enabled')).toBe('1');
  });

  it('consumes return target only once', async () => {
    const { setPostAuthTarget, consumePostAuthTarget } = await import('../src/utils/authBridge.js');

    setPostAuthTarget({ kind: 'history_detail', analysisId: 'analysis-1' });

    expect(consumePostAuthTarget()).toEqual({ kind: 'history_detail', analysisId: 'analysis-1' });
    expect(consumePostAuthTarget()).toBeNull();
  });
});
