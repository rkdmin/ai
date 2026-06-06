import { isNativePlatform } from './platform';

// 외부 URL(쿠팡파트너스 등)을 연다 (Phase 6-2).
//   - 네이티브(앱): @capacitor/browser 로 시스템 브라우저/커스텀 탭에서 연다 (인앱 WebView 안에서 열리지 않게).
//   - 웹/브라우저: window.open 새 탭.
// 동적 import 라 웹 번들엔 플러그인이 포함되지 않는다.
export async function openExternalUrl(url) {
  if (!url) return;
  if (isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch {
      // 플러그인 실패 시 아래 웹 폴백으로.
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
