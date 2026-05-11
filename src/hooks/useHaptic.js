// 모바일 햅틱 헬퍼.
// - Capacitor 네이티브 빌드: @capacitor/haptics 가 설치되어 있으면 ImpactStyle 로 호출.
// - 웹 / Capacitor 미설치 빌드: navigator.vibrate 폴백 (Android Chrome 만 지원).
// - 둘 다 없으면 조용히 no-op — 호출부가 try/catch 없이 사용 가능.
//
// 의도적으로 동기 인터페이스. async 로 두면 onClick 핸들러 흐름이 끊긴다.
let hapticsModule = null;
let hapticsTried = false;

async function loadHaptics() {
  if (hapticsTried) return hapticsModule;
  hapticsTried = true;
  try {
    const mod = await import('@capacitor/haptics');
    hapticsModule = mod;
  } catch {
    hapticsModule = null;
  }
  return hapticsModule;
}

function vibrateFallback(ms) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch { /* noop */ }
}

export function tapHaptic(style = 'light') {
  // 즉시 vibrate 폴백을 시도해서 첫 탭에서 반응이 있도록.
  // Capacitor 네이티브가 로드되면 다음 탭부터는 그쪽이 우선 호출됨.
  if (hapticsModule?.Haptics) {
    const ImpactStyle = hapticsModule.ImpactStyle || {};
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    try {
      hapticsModule.Haptics.impact({ style: map[style] || ImpactStyle.Light });
      return;
    } catch { /* fall through */ }
  }
  const ms = style === 'heavy' ? 22 : style === 'medium' ? 14 : 8;
  vibrateFallback(ms);
  // 백그라운드 동적 임포트 — 다음 탭부터 네이티브 사용.
  if (!hapticsTried) loadHaptics();
}

export function successHaptic() {
  if (hapticsModule?.Haptics?.notification && hapticsModule.NotificationType) {
    try {
      hapticsModule.Haptics.notification({ type: hapticsModule.NotificationType.Success });
      return;
    } catch { /* fall through */ }
  }
  vibrateFallback([10, 40, 10]);
  if (!hapticsTried) loadHaptics();
}

// onClick 래퍼 — `onClick={withHaptic(handler)}` 또는 `onClick={withHaptic(handler, 'medium')}`.
export function withHaptic(handler, style = 'light') {
  return (...args) => {
    tapHaptic(style);
    return handler?.(...args);
  };
}
