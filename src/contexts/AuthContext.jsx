import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  consumeOAuthRedirect,
  getAuthSession,
  isGuestMode,
  signInWithOAuth,
  signOut as bridgeSignOut,
  startGuestMode,
  startTestSession,
} from '../utils/authBridge';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getAuthSession());
  const [guest, setGuest] = useState(() => isGuestMode());

  useEffect(() => {
    const next = consumeOAuthRedirect();
    if (next) {
      setSession(next);
      setGuest(false);
    }
  }, []);

  const signIn = useCallback((provider) => {
    signInWithOAuth(provider);
    return true;
  }, []);

  // dev/mock 전용 테스트 로그인 — 가짜 세션을 즉시 활성화.
  const signInAsTestUser = useCallback(() => {
    const next = startTestSession();
    setSession(next);
    setGuest(false);
    return true;
  }, []);

  const continueAsGuest = useCallback(() => {
    startGuestMode();
    setGuest(true);
    setSession(null);
  }, []);

  const signOut = useCallback(() => {
    bridgeSignOut();
    setSession(null);
    setGuest(false);
  }, []);

  const value = useMemo(() => ({
    session,
    isAuthenticated: Boolean(session?.accessToken),
    isGuest: guest && !session?.accessToken,
    signIn,
    signInAsTestUser,
    continueAsGuest,
    signOut,
  }), [session, guest, signIn, signInAsTestUser, continueAsGuest, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      session: null,
      isAuthenticated: false,
      isGuest: false,
      signIn: () => false,
      signInAsTestUser: () => false,
      continueAsGuest: () => {},
      signOut: () => {},
    };
  }
  return ctx;
}
