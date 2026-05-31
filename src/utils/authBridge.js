const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SESSION_KEY = 'beaumi.auth.session';
const GUEST_KEY = 'beaumi.guest.enabled';
const RETURN_TARGET_KEY = 'beaumi.auth.return_target';

function readSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function writeSession(session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.localStorage.removeItem(GUEST_KEY);
  } catch { /* noop */ }
}

export function getAuthSession() {
  return readSession();
}

export function getAccessToken() {
  return readSession()?.accessToken || null;
}

export function isGuestMode() {
  try {
    return window.localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

export function startGuestMode() {
  try {
    window.localStorage.setItem(GUEST_KEY, '1');
    window.localStorage.removeItem(RETURN_TARGET_KEY);
  } catch { /* noop */ }
}

export function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(GUEST_KEY);
    window.localStorage.removeItem(RETURN_TARGET_KEY);
  } catch { /* noop */ }
}

export function setPostAuthTarget(target) {
  if (typeof window === 'undefined') return;
  try {
    if (!target) {
      window.localStorage.removeItem(RETURN_TARGET_KEY);
      return;
    }
    window.localStorage.setItem(RETURN_TARGET_KEY, JSON.stringify(target));
  } catch { /* noop */ }
}

export function consumePostAuthTarget() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(RETURN_TARGET_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(RETURN_TARGET_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function consumeOAuthRedirect() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  if (!accessToken) return readSession();

  const expiresIn = Number(params.get('expires_in') || '3600');
  const session = {
    accessToken,
    refreshToken: params.get('refresh_token') || null,
    tokenType: params.get('token_type') || 'bearer',
    providerToken: params.get('provider_token') || null,
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
  };
  writeSession(session);
  try {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  } catch { /* noop */ }
  return session;
}

export function signInWithOAuth(provider) {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL이 설정되지 않았습니다.');
  }
  const redirectTo = window.location.origin + window.location.pathname;
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set('provider', provider);
  url.searchParams.set('redirect_to', redirectTo);
  window.location.assign(url.toString());
}
