// TODO: 사용자 프로필(닉네임/연동/통계/퍼스널컬러) 을 Supabase 세션·메타데이터에서 로드.
// 현재는 모두 mock. 분석 히스토리 메뉴만 onNav 로 연결됨.
import { useState } from 'react';
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
  { n: '05', label: '개인정보 처리방침', en: 'PRIVACY POLICY', kind: 'link', href: '/privacy.html' },
  { n: '06', label: '이용약관', en: 'TERMS OF SERVICE', kind: 'link', href: '/terms.html' },
  { n: '07', label: '고객센터', en: 'SUPPORT', kind: 'link', href: 'mailto:support@beaumi.app' },
];

export default function My({ onNav, onBack }) {
  // Apple 5.1.1(v) + 개인정보보호법 §35.3 — 사용자가 앱 안에서 직접 계정 삭제를 시작할 수 있어야 함.
  // 두 단계 confirm: 1) 안내 모달, 2) 텍스트 일치 확인. 실제 호출은 deleteAccount 미구현 시점 안내만.
  const [confirmStep, setConfirmStep] = useState(null); // null | 'intro' | 'verify'
  const [verifyText, setVerifyText] = useState('');
  const VERIFY_PHRASE = '삭제';

  async function executeDelete() {
    // TODO: Supabase rpc('delete_account') + 백엔드 user data purge endpoint 호출.
    // 현재는 mock — 클라이언트 저장 정보만 정리하고 holders alert.
    try { window.localStorage.removeItem('beaumi.onboarded'); } catch { /* noop */ }
    setConfirmStep(null);
    alert('계정 삭제 요청을 접수했어요. 분석 데이터·저장 카드는 14일 내 영구 삭제됩니다.');
    onBack?.();
  }

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
          {MENU.map((m, i) => {
            const common = {
              role: 'button',
              tabIndex: 0,
              className: 'tappable',
              style: {
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px',
                borderBottom: i < MENU.length - 1 ? '1px solid #e8e8e8' : '1px solid #000',
                minHeight: 56,
                textDecoration: 'none', color: 'inherit',
              },
            };
            const inner = (
              <>
                <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22 }}>{m.n}</span>
                <div style={{ flex: 1 }}>
                  <div className="ko" style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-.005em' }}>{m.label}</div>
                  <div className="label" style={{ fontSize: 9, color: '#7a7a7a', marginTop: 2 }}>{m.en}</div>
                </div>
                {Icons.arrow(14, '#7a7a7a')}
              </>
            );
            if (m.kind === 'link' && m.href) {
              const isExternal = m.href.startsWith('http') || m.href.startsWith('mailto:');
              return (
                <a key={i} href={m.href} {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...common}>
                  {inner}
                </a>
              );
            }
            return (
              <div key={i} onClick={m.go ? () => onNav?.(m.go) : undefined} {...common}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* 계정 삭제 — Apple 5.1.1(v) / 개보법 §35.3 필수. 메뉴와 분리해 강조. */}
        <div style={{ padding: '18px 22px 4px' }}>
          <button
            onClick={() => setConfirmStep('intro')}
            style={{
              width: '100%', background: '#fff', color: '#c45a3b',
              border: '1px solid #c45a3b', padding: '14px 0',
              fontFamily: 'Pretendard', fontSize: 13, fontWeight: 500, minHeight: 48, cursor: 'pointer',
            }}
          >
            계정 삭제 · DELETE ACCOUNT
          </button>
          <div className="ko" style={{ fontSize: 10.5, color: '#a8a8a8', marginTop: 8, lineHeight: 1.55, fontWeight: 300 }}>
            삭제 요청 시 분석 사진·결과 카드·계정 정보가 14일 내 영구 삭제되며, 복구할 수 없어요.
          </div>
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

      {confirmStep && (
        <DeleteAccountSheet
          step={confirmStep}
          verifyText={verifyText}
          verifyPhrase={VERIFY_PHRASE}
          onChangeVerify={setVerifyText}
          onClose={() => { setConfirmStep(null); setVerifyText(''); }}
          onProceed={() => setConfirmStep('verify')}
          onConfirm={executeDelete}
        />
      )}
    </div>
  );
}

function DeleteAccountSheet({ step, verifyText, verifyPhrase, onChangeVerify, onClose, onProceed, onConfirm }) {
  const canConfirm = verifyText.trim() === verifyPhrase;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="계정 삭제 확인"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: '#fff', color: '#000',
          padding: '22px 22px max(env(safe-area-inset-bottom), 22px)',
          borderTop: '1px solid #000',
          animation: 'fade-in .2s cubic-bezier(.2,.7,.3,1)',
        }}
      >
        <div className="label" style={{ marginBottom: 10, color: '#c45a3b' }}>DELETE ACCOUNT</div>
        {step === 'intro' ? (
          <>
            <div className="ko" style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.45, marginBottom: 12 }}>
              정말 계정을 삭제할까요?
            </div>
            <ul className="ko" style={{ fontSize: 12.5, color: '#5a5a5a', lineHeight: 1.7, fontWeight: 300, marginLeft: 16, marginBottom: 18 }}>
              <li>업로드한 사진은 즉시 삭제 큐에 들어갑니다.</li>
              <li>분석 결과 · 저장한 카드 · 공유 기록이 14일 내 영구 삭제됩니다.</li>
              <li>같은 이메일로 다시 가입하더라도 이전 데이터는 복구되지 않습니다.</li>
            </ul>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '14px 0', minHeight: 48, fontSize: 13, cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={onProceed} style={{ flex: 1, background: '#c45a3b', color: '#fff', border: 'none', padding: '14px 0', minHeight: 48, fontSize: 13, cursor: 'pointer' }}>
                계속
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ko" style={{ fontSize: 16, fontWeight: 400, lineHeight: 1.45, marginBottom: 14 }}>
              확인을 위해 아래 칸에 <b style={{ fontWeight: 600 }}>{verifyPhrase}</b> 을(를) 입력해 주세요.
            </div>
            <input
              type="text"
              value={verifyText}
              onChange={(e) => onChangeVerify(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              inputMode="text"
              aria-label="삭제 확인 문구 입력"
              style={{
                width: '100%', padding: '12px 14px', border: '1px solid #000',
                fontFamily: 'Pretendard', fontSize: 16, marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '14px 0', minHeight: 48, fontSize: 13, cursor: 'pointer' }}>
                취소
              </button>
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                style={{
                  flex: 1, background: canConfirm ? '#c45a3b' : '#e8e8e8',
                  color: canConfirm ? '#fff' : '#a8a8a8', border: 'none',
                  padding: '14px 0', minHeight: 48, fontSize: 13, cursor: canConfirm ? 'pointer' : 'not-allowed',
                }}
              >
                영구 삭제
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
