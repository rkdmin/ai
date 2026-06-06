// Capacitor 네이티브(앱) 실행 여부. 네이티브 레이어가 window.Capacitor 를 주입한다.
// 브라우저에서는 undefined → false (웹 폴백 사용).
export const isNativePlatform = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true;
