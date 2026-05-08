import { useEffect, useState } from 'react';
import { Icons } from './common/Icons';

const STEPS = [
  { en: 'FACE DETECTION', kr: '얼굴 인식 중' },
  { en: 'FEATURE ANALYSIS', kr: '특징 분석 중' },
  { en: 'STYLE MATCHING', kr: '스타일 매칭 중' },
  { en: 'CARD CURATION', kr: '카드 큐레이션 중' },
];

export default function Loading({ onCancel, onDone, durations = [1500, 1800, 1600, 1400] }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEPS.length) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), durations[step] || 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 18px' }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 4, display: 'flex', alignItems: 'center' }}>
          {Icons.close(20)}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px' }}>
        <div className="label" style={{ marginBottom: 14, color: '#7a7a7a' }}>STEP 02 · ANALYZING</div>
        <div className="ko" style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 36 }}>
          분석 중이에요…
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderTop: '1px solid #e8e8e8', borderBottom: i === STEPS.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
                <span className="serif-i" style={{ width: 28, color: '#a8a8a8' }}>0{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div className="label" style={{ fontSize: 10, color: state === 'pending' ? '#a8a8a8' : '#000', marginBottom: 2 }}>{s.en}</div>
                  <div className="ko" style={{ fontSize: 14, fontWeight: state === 'active' ? 500 : 400, color: state === 'pending' ? '#a8a8a8' : '#1a1a1a' }}>{s.kr}</div>
                </div>
                <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {state === 'done' ? Icons.check(14)
                    : state === 'active' ? <Spinner />
                    : <span style={{ width: 6, height: 6, background: '#a8a8a8' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '14px 22px 32px' }}>
        <button onClick={onCancel} style={{ width: '100%', background: 'none', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', color: '#7a7a7a', cursor: 'pointer' }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke="#e8e8e8" strokeWidth="2" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </svg>
  );
}
