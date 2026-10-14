/**
 * My(마이페이지) mock 축소 회귀 테스트 (Phase 4-7).
 * - 프로필은 세션 JWT(email/provider)에서 실데이터로 표시
 * - 데이터 소스 없는 fake stats / 유저 퍼스널컬러 / dead 메뉴 / dead settings 버튼 제거
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// useAuth 를 테스트에서 제어 가능한 상태로 모킹.
const authState = vi.hoisted(() => ({ session: null, isAuthenticated: false }));
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

import My from '../src/components/My';

beforeEach(() => {
  authState.session = null;
  authState.isAuthenticated = false;
});

describe('My — mock 축소', () => {
  it('fake stats / 유저 퍼스널컬러 / dead 메뉴 / settings 버튼이 제거됨', () => {
    render(<My onNav={() => {}} onBack={() => {}} onSignOut={() => {}} />);

    // 데이터 소스 없는 가짜 통계 제거
    expect(screen.queryByText('ANALYSES')).toBeNull();
    expect(screen.queryByText('UNLOCKED')).toBeNull();
    // 유저 단위로 저장되지 않는 퍼스널컬러 mock 블록 제거
    expect(screen.queryByText('MY PERSONAL COLOR')).toBeNull();
    // dead 메뉴 제거
    expect(screen.queryByText('저장한 카드')).toBeNull();
    expect(screen.queryByText('공유한 결과')).toBeNull();
    expect(screen.queryByText('알림 설정')).toBeNull();
    // dead settings(gear) 버튼 제거
    expect(screen.queryByLabelText('settings')).toBeNull();
  });

  it('게스트의 분석 히스토리는 onNav("history"), 로그인 CTA는 onNav("login")으로 동작', () => {
    const onNav = vi.fn();
    const onSignOut = vi.fn();
    render(<My onNav={onNav} onBack={() => {}} onSignOut={onSignOut} />);

    fireEvent.click(screen.getByText('분석 히스토리'));
    expect(onNav).toHaveBeenCalledWith('history');

    fireEvent.click(screen.getByText('로그인'));
    expect(onNav).toHaveBeenCalledWith('login');
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('세션 없으면 게스트 프로필과 기기 저장 상태를 표시', () => {
    render(<My onNav={() => {}} onBack={() => {}} onSignOut={() => {}} />);
    expect(screen.getByText('게스트 프로필')).toBeInTheDocument();
    expect(screen.getByText('이 기기에만 저장됨')).toBeInTheDocument();
    expect(screen.queryByText('beaumi_user')).toBeNull();
  });

  it('세션 JWT 의 email/provider 를 실데이터로 표시', () => {
    const payload = window.btoa(JSON.stringify({ email: 'me@test.com', app_metadata: { provider: 'google' } }));
    authState.session = { accessToken: `h.${payload}.s` };
    authState.isAuthenticated = true;

    render(<My onNav={() => {}} onBack={() => {}} onSignOut={() => {}} />);
    expect(screen.getByText('me@test.com')).toBeInTheDocument();
    expect(screen.getByText('Google 로그인')).toBeInTheDocument();
  });

  it('홈과 같은 최근 Beauty Profile 제목을 표시하고 legacy에는 없는 무드를 채우지 않는다', () => {
    const { rerender } = render(<My profile={{ schemaVersion: 3, moodTitle: '차분한 이미지' }} onNav={() => {}} onBack={() => {}} onSignOut={() => {}} />);
    expect(screen.getByText('차분한 이미지')).toBeInTheDocument();

    rerender(<My profile={{ schemaVersion: 1, legacy: true, faceType: '계란형' }} onNav={() => {}} onBack={() => {}} onSignOut={() => {}} />);
    expect(screen.getByText('계란형')).toBeInTheDocument();
    expect(screen.queryByText('나의 Beauty Mood')).toBeNull();
  });
});
