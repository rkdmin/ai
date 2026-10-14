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
    <div className="wf-screen" style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
      <div
        aria-label="beaumi"
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          background: '#f3f4f6',
          color: '#111827',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="wm" style={{ fontSize: 20 }}>b</span>
      </div>
    </div>
  );
}
