import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  consumeOAuthRedirect,
  getAuthSession,
  isGuestMode,
  signInWithOAuth,
  signOut as bridgeSignOut,
  startGuestMode,
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
    continueAsGuest,
    signOut,
  }), [session, guest, signIn, continueAsGuest, signOut]);

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
      continueAsGuest: () => {},
      signOut: () => {},
    };
  }
  return ctx;
}
