import { beforeEach, describe, expect, it } from 'vitest';
import {
  GUEST_PROFILE_OWNER,
  loadLatestAnalysis,
  profileOwnerForSession,
  profileStorageKey,
  saveLatestAnalysis,
} from '../src/utils/profileStorage';

function session(sub) {
  const payload = window.btoa(JSON.stringify({ sub, email: `${sub}@test.local` }));
  return { accessToken: `h.${payload}.s` };
}

beforeEach(() => window.localStorage.clear());

describe('guest-first profile storage', () => {
  it('재진입해도 같은 JSON 결과를 복원하고 원본 사진은 저장하지 않는다', () => {
    const result = {
      schemaVersion: 3,
      faceType: '계란형',
      moodTitle: '차분한 이미지',
      frontImageUrl: 'https://private.test/photo.jpg',
      nested: { dataUrl: 'data:image/jpeg;base64,secret', safe: true },
    };

    saveLatestAnalysis(GUEST_PROFILE_OWNER, result);

    expect(loadLatestAnalysis(GUEST_PROFILE_OWNER)).toEqual({
      schemaVersion: 3,
      faceType: '계란형',
      moodTitle: '차분한 이미지',
      nested: { safe: true },
    });
    expect(window.localStorage.getItem(profileStorageKey(GUEST_PROFILE_OWNER, 3))).not.toContain('photo.jpg');
  });

  it('schemaVersion을 저장 키에 포함한다', () => {
    saveLatestAnalysis(GUEST_PROFILE_OWNER, { schemaVersion: 3, faceType: '계란형' });
    expect(profileStorageKey(GUEST_PROFILE_OWNER, 3)).toContain(':v3');
    expect(window.localStorage.getItem(profileStorageKey(GUEST_PROFILE_OWNER, 3))).not.toBeNull();
  });

  it('계정 전환 시 이전 계정 저장본을 노출하지 않는다', () => {
    const first = profileOwnerForSession(session('account-a'));
    const second = profileOwnerForSession(session('account-b'));
    saveLatestAnalysis(first, { schemaVersion: 3, moodTitle: '첫 계정 결과' });

    expect(loadLatestAnalysis(second)).toBeNull();
    saveLatestAnalysis(second, { schemaVersion: 3, moodTitle: '두 번째 계정 결과' });
    expect(loadLatestAnalysis(first)?.moodTitle).toBe('첫 계정 결과');
    expect(loadLatestAnalysis(second)?.moodTitle).toBe('두 번째 계정 결과');
  });

  it('legacy 저장본에 없는 무드 필드를 만들어 넣지 않는다', () => {
    saveLatestAnalysis(GUEST_PROFILE_OWNER, { schemaVersion: 1, legacy: true, faceType: '계란형' });
    expect(loadLatestAnalysis(GUEST_PROFILE_OWNER)).toEqual({ schemaVersion: 1, legacy: true, faceType: '계란형' });
  });
});
