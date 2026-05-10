// TODO: 사용자 프로필(닉네임/연동/통계/퍼스널컬러) 을 Supabase 세션·메타데이터에서 로드.
// 현재는 모두 mock. 분석 히스토리 메뉴만 onNav 로 연결됨.
import { StatusBar } from './common/StatusBar';
import { BackHeader, TabBar } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

const STATS = [
  { n: '04', label: '분석', en: 'ANALYSES' },
  { n: '12', label: '잠금해제', en: 'UNLOCKED' },
  { n: '07', label: '공유', en: 'SHARED' },
];

const MENU = [
  { n: '01', label: '분석 히스토리', en: 'ANALYSIS HISTORY', go: 'history' },
  { n: '02', label: '저장한 카드', en: 'SAVED CARDS' },
  { n: '03', label: '공유한 결과', en: 'SHARED RESULTS' },
  { n: '04', label: '알림 설정', en: 'NOTIFICATIONS' },
  { n: '05', label: '개인정보', en: 'PRIVACY' },
  { n: '06', label: '고객센터', en: 'SUPPORT' },
];

export default function My({ onNav, onBack }) {
  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader
        label="ACCOUNT"
        title="MY"
        onBack={onBack}
        right={
          <button style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }} aria-label="settings">
            {Icons.gear(16)}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '28px 22px 24px', borderBottom: '1px solid #000', display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #000' }}>
            <FacePlaceholder w="100%" h="100%" tone="light" label="" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="serif-i" style={{ fontSize: 13, color: '#7a7a7a', marginBottom: 4 }}>since · march 2026</div>
            <div className="ko" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-.005em' }}>beaumi_user</div>
            <div className="ko" style={{ fontSize: 11.5, color: '#7a7a7a', fontWeight: 300, marginTop: 2 }}>kakao · 카카오 연동</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #000' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ padding: '18px 12px', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid #000' : 'none' }}>
              <div className="serif-i" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.02em' }}>{s.n}</div>
              <div className="label" style={{ marginTop: 4, fontSize: 9 }}>{s.en}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid #e8e8e8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div className="label">MY PERSONAL COLOR</div>
            <span className="ko" style={{ fontSize: 11, color: '#7a7a7a', cursor: 'pointer' }}>수정 →</span>
          </div>
          <div style={{ display: 'flex', gap: 0, height: 36, marginBottom: 10 }}>
            {['#f9d4a0', '#f5b888', '#e89870', '#d97050'].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="ko" style={{ fontSize: 14, fontWeight: 500 }}>
              봄 웜톤 <span style={{ fontWeight: 300, color: '#7a7a7a' }}>· Spring Warm</span>
            </div>
            <div className="serif-i" style={{ fontSize: 12, color: '#7a7a7a' }}>set · 04 / 28</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #000', marginTop: 8 }}>
          {MENU.map((m, i) => (
            <div
              key={i}
              onClick={m.go ? () => onNav?.(m.go) : undefined}
              role="button"
              tabIndex={0}
              className="tappable"
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
                borderBottom: i < MENU.length - 1 ? '1px solid #e8e8e8' : '1px solid #000',
                minHeight: 56,
              }}
            >
              <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22 }}>{m.n}</span>
              <div style={{ flex: 1 }}>
                <div className="ko" style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-.005em' }}>{m.label}</div>
                <div className="label" style={{ fontSize: 9, color: '#7a7a7a', marginTop: 2 }}>{m.en}</div>
              </div>
              {Icons.arrow(14, '#7a7a7a')}
            </div>
          ))}
        </div>

        <div style={{ padding: '24px 22px 30px', textAlign: 'center' }}>
          <div className="wm" style={{ fontSize: 18, fontWeight: 300, marginBottom: 6 }}>beaumi</div>
          <div className="serif-i" style={{ fontSize: 11, color: '#a8a8a8' }}>v 1.0.0 · sharing your beauty, every day</div>
          <button
            style={{
              marginTop: 16, background: '#fff', border: '1px solid #d4d4d4', padding: '10px 18px',
              fontFamily: 'Pretendard', fontSize: 12, color: '#5a5a5a', minHeight: 40,
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      <TabBar active="my" onNav={onNav} />
    </div>
  );
}
