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

  it('startTestSession writes a session whose JWT decodes to test email/provider', async () => {
    const { startTestSession, getAuthSession } = await import('../src/utils/authBridge.js');

    const session = startTestSession();
    // 저장되고 게스트 모드는 해제된다.
    expect(getAuthSession()?.accessToken).toBe(session.accessToken);
    expect(window.localStorage.getItem('beaumi.guest.enabled')).toBeNull();

    // My.jsx parseJwt 와 동일한 방식으로 payload 를 디코드할 수 있어야 한다.
    const payload = JSON.parse(decodeURIComponent(escape(window.atob(session.accessToken.split('.')[1]))));
    expect(payload.email).toBe('test@beaumi.app');
    expect(payload.app_metadata.provider).toBe('google');
  });
});
