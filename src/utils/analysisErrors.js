const PHOTO_CODES = new Set(['INVALID_IMAGE', 'NO_FACE', 'MULTIPLE_FACES', 'FACE_TOO_SMALL', 'UNSUPPORTED_PHOTO']);
const SERVICE_CODES = new Set(['RATE_LIMITED', 'AI_UNAVAILABLE', 'AI_ERROR']);
const NETWORK_PATTERN = /연결|네트워크|fetch|network|timeout|high demand|try again later|temporarily|unavailable|overloaded/i;

export function classifyAnalysisError(error) {
  if (PHOTO_CODES.has(error?.code)) return 'face';
  if (SERVICE_CODES.has(error?.code)) return 'network';

  const message = String(error?.message || error || '');
  return error?.status >= 500 || NETWORK_PATTERN.test(message) ? 'network' : 'face';
}
