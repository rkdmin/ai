const STORAGE_PREFIX = 'beaumi.analysis';
export const GUEST_PROFILE_OWNER = 'guest';

function decodeJwtPayload(token) {
  try {
    const encoded = String(token || '').split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(decodeURIComponent(escape(window.atob(padded))));
  } catch {
    return null;
  }
}

export function profileOwnerForSession(session) {
  if (!session?.accessToken) return GUEST_PROFILE_OWNER;
  const claims = decodeJwtPayload(session.accessToken);
  const identity = claims?.sub || claims?.email || session?.user?.id;
  return identity ? `account:${identity}` : 'account:unknown';
}

function indexKey(owner) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(owner)}:current`;
}

export function profileStorageKey(owner, schemaVersion) {
  return `${STORAGE_PREFIX}:${encodeURIComponent(owner)}:v${schemaVersion}`;
}

const PRIVATE_RESULT_KEYS = new Set([
  'frontImage',
  'frontImageUrl',
  'image',
  'imageBase64',
  'photo',
  'photoUrl',
  'file',
  'dataUrl',
  'generatedImage',
]);

export function resultWithoutPhotos(value) {
  if (Array.isArray(value)) return value.map(resultWithoutPhotos);
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && value.startsWith('data:image/') ? undefined : value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_RESULT_KEYS.has(key))
      .map(([key, item]) => [key, resultWithoutPhotos(item)])
      .filter(([, item]) => item !== undefined),
  );
}

export function saveLatestAnalysis(owner, result, storage = window.localStorage) {
  if (!result || !storage) return null;
  const clean = resultWithoutPhotos(result);
  const schemaVersion = Number(clean.schemaVersion) || 1;
  clean.schemaVersion = schemaVersion;
  const key = profileStorageKey(owner, schemaVersion);
  storage.setItem(key, JSON.stringify(clean));
  storage.setItem(indexKey(owner), key);
  return clean;
}

export function loadLatestAnalysis(owner, storage = window.localStorage) {
  try {
    const key = storage?.getItem(indexKey(owner));
    const raw = key ? storage.getItem(key) : null;
    if (!raw) return null;
    const result = JSON.parse(raw);
    return result && typeof result === 'object' ? result : null;
  } catch {
    return null;
  }
}
