import * as Sentry from '@sentry/browser';

// 런타임 에러 트래킹 (Phase 6-2).
// VITE_SENTRY_DSN 이 있을 때만 활성화한다 — DSN 이 없으면 init 을 건너뛰고
// captureException 은 안전한 no-op 이 되므로 개발/미설정 환경엔 영향이 없다.
//
// ⚠️ 얼굴 사진 앱이라 PII 전송을 금지한다 (sendDefaultPii: false).
//   Sentry breadcrumb 는 fetch 의 URL/상태만 남기고 body(이미지 dataUrl)는 보내지 않는다.

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0, // MVP: 퍼포먼스 트레이싱 미사용 (에러 캡처만)
    sendDefaultPii: false,
  });
  return true;
}

// 수동 에러 보고. init 이 안 됐으면 Sentry 가 알아서 no-op 한다.
export function captureError(error, context) {
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
