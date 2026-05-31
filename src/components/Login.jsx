import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';

const GATE_COPY = {
  history: {
    title: '지난 분석 기록을 보려면 로그인이 필요해요',
    body: '로그인하면 분석 결과와 카드 기록을 저장하고, 나중에 다시 이어볼 수 있어요.',
    eyebrow: 'HISTORY ACCESS',
  },
  history_detail: {
    title: '이 분석 기록을 열려면 로그인이 필요해요',
    body: '로그인 후에는 지난 카드 결과와 생성 기록까지 다시 확인할 수 있어요.',
    eyebrow: 'ARCHIVE DETAIL',
  },
  my: {
    title: '내 정보와 활동을 보려면 로그인이 필요해요',
    body: '로그인하면 퍼스널 컬러, 분석 활동, 계정 설정을 한 곳에서 관리할 수 있어요.',
    eyebrow: 'MY ACCOUNT',
  },
  unlock: {
    title: '잠금 해제와 저장을 계속하려면 로그인이 필요해요',
    body: '로그인하면 결과를 저장하고, 다음 기기에서도 같은 기록을 다시 볼 수 있어요.',
    eyebrow: 'UNLOCK',
  },
};

export default function Login({ onNext, onOAuth, onGuest, onBack, mode, reason = 'history' }) {
  const isGate = mode === 'guest_gate';
  const gateCopy = GATE_COPY[reason] || GATE_COPY.history;

  const startOAuth = (provider) => {
    try {
      if (onOAuth) {
        const started = onOAuth(provider);
        if (started === false) onNext?.();
      } else {
        onNext?.();
      }
    } catch (e) {
      alert(e?.message || '로그인을 시작할 수 없어요.');
    }
  };

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <button onClick={onBack} className="icon-btn" style={{ marginLeft: -6 }} aria-label="back">{Icons.back(20)}</button>
        <span className="label">{isGate ? 'UNLOCK' : 'SIGN IN'}</span>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      {isGate && (
        <div style={{ margin: '18px 22px 0', padding: '14px 16px', background: '#f6f1ed', borderLeft: '2px solid #000' }}>
          <div className="label" style={{ color: '#000', marginBottom: 6 }}>{gateCopy.eyebrow}</div>
          <div className="ko" style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.55, fontWeight: 500, marginBottom: 6 }}>
            {gateCopy.title}
          </div>
          <div className="ko" style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.6 }}>
            {gateCopy.body}
          </div>
        </div>
      )}

      <div style={{ padding: '48px 28px 0', textAlign: 'center' }}>
        <div className="wm" style={{ fontSize: 36, letterSpacing: '-.01em', fontWeight: 200, lineHeight: 1 }}>beaumi</div>
        <div style={{ width: 24, height: 1, background: '#000', margin: '18px auto' }} />
        <div className="serif-i" style={{ fontSize: 13.5, color: '#5a5a5a' }}>
          {isGate ? '로그인하고 기록을 이어보세요' : '오늘의 얼굴을 더 정확하게'}
        </div>
      </div>

      <div style={{ padding: '56px 28px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => startOAuth('kakao')}
          style={{ background: '#FEE500', color: '#000', border: 'none', padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
            <path d="M12 3C6.5 3 2 6.5 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.7c0 .2.2.4.4.3l4.4-2.9c.5.1 1 .1 1.6.1 5.5 0 10-3.5 10-8S17.5 3 12 3z" />
          </svg>
          <span className="ko" style={{ fontSize: 14, fontWeight: 500 }}>카카오로 시작하기</span>
        </button>
        <button
          onClick={() => startOAuth('google')}
          style={{ background: '#fff', color: '#000', border: '1px solid #000', padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="ko" style={{ fontSize: 14, fontWeight: 500 }}>구글로 계속하기</span>
        </button>
        {!isGate && (
          <button
            onClick={() => onGuest?.() || onNext?.()}
            style={{ background: '#fff', color: '#5a5a5a', border: '1px solid #d4d4d4', padding: '13px 0', fontFamily: 'Pretendard', fontSize: 13, minHeight: 44 }}
          >
            로그인 없이 1회 체험하기
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 28px max(env(safe-area-inset-bottom), 28px)', textAlign: 'center', fontSize: 11, color: '#a8a8a8', lineHeight: 1.7, fontWeight: 300, flexShrink: 0 }}>
        가입 시{' '}
        <a
          href="/terms.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#5a5a5a', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          이용약관
        </a>{' '}
        및{' '}
        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#5a5a5a', textDecoration: 'underline', textUnderlineOffset: 2 }}
        >
          개인정보처리방침
        </a>
        에 동의한 것으로 간주됩니다.
      </div>
    </div>
  );
}
