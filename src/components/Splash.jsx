// TODO: 실제 부팅/스플래시 동안 토큰 검증·세션 복원·딥링크 처리 등을 붙일 자리.
// Capacitor 네이티브 SplashScreen 이 이미 cold-boot 동안 표시되므로,
// JS 진입 후에는 한 프레임만 잡아둔다. 200ms 는 페이드 페이지트랜지션 충돌 방지용 최소값.
import { useEffect } from 'react';

export default function Splash({ onNext }) {
  useEffect(() => {
    const t = setTimeout(() => onNext?.(), 200);
    return () => clearTimeout(t);
  }, [onNext]);
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        background: '#000',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div className="wm" style={{ fontSize: 42, letterSpacing: '-.01em', fontWeight: 200, lineHeight: 1 }}>
        beaumi
      </div>
      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,.5)', margin: '24px 0' }} />
      <div className="serif-i" style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', letterSpacing: '.02em' }}>
        Sharing your beauty, every day
      </div>
      <div style={{ position: 'absolute', bottom: 42, left: 0, right: 0, textAlign: 'center' }}>
        <span className="label" style={{ color: 'rgba(255,255,255,.3)' }}>© 2026 BEAUMI</span>
      </div>
    </div>
  );
}
