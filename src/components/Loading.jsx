import { useEffect, useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import mutedDot from '../assets/figma/loading-dot-muted.svg';
import activeDot from '../assets/figma/loading-dot-active.svg';

const DEFAULT_STEPS = [
  { label: '얼굴형 확인', en: 'FACE SHAPE' },
  { label: '얼굴선과 비율 분석', en: 'FACE PROPORTION' },
  { label: '전체적인 인상 패턴 해석', en: 'MOOD PATTERN' },
  { label: 'Beauty Mood 정리', en: 'BEAUTY MOOD' },
];
const STEP_INTERVAL_MS = 1100;

export default function Loading({ task, onNext, onSuccess, onError, onCancel, label = '분석 중', steps, photoUrl }) {
  const items = steps || DEFAULT_STEPS;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    let alive = true;
    const interval = setInterval(() => setIdx((value) => Math.min(value + 1, items.length - 1)), STEP_INTERVAL_MS);

    if (task && typeof task.then === 'function') {
      task.then(
        (result) => {
          if (!alive || fired.current) return;
          fired.current = true;
          setIdx(items.length - 1);
          setDone(true);
          setTimeout(() => alive && onSuccess?.(result), 220);
        },
        (error) => {
          if (!alive || fired.current) return;
          fired.current = true;
          onError?.(error);
        },
      );
    } else if (onNext) {
      const timeout = setTimeout(() => {
        if (!alive || fired.current) return;
        fired.current = true;
        setIdx(items.length - 1);
        setDone(true);
        setTimeout(() => alive && onNext?.(), 220);
      }, STEP_INTERVAL_MS * (items.length + 1));
      return () => {
        alive = false;
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
    return () => {
      alive = false;
      clearInterval(interval);
    };
    // The task belongs to the stage that mounted this screen and must run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wf-screen">
      <StatusBar />
      <main style={{ flex: 1, padding: '40px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 100, height: 100, borderRadius: 50, overflow: 'hidden', background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#9ca3af', fontSize: 12, fontWeight: 500 }}>
          {photoUrl ? <img src={photoUrl} alt="분석 중인 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Photo'}
        </div>
        <div className="wf-eyebrow" style={{ marginTop: 18 }}>{label.toUpperCase()}</div>
        <h1 className="ko" style={{ margin: '8px 0 24px', textAlign: 'center', fontSize: 22, lineHeight: 1.35, fontWeight: 700 }}>
          {label === '분석 중' ? <>나만의 Beauty Mood를<br />분석하고 있어요</> : <>{label}을<br />준비하고 있어요</>}
        </h1>

        <div style={{ width: '100%', maxWidth: 300, display: 'grid', gap: 14 }} aria-live="polite">
          {items.map((step, index) => {
            const complete = done || index < idx;
            const current = !done && index === idx;
            return (
              <div key={`${step.en}-${index}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: complete || current ? '#374151' : '#9ca3af' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: current ? 700 : 400 }}>
                    <span aria-hidden="true">{complete ? '✓' : current ? '●' : '○'}</span>
                    <span className="ko">{step.label}</span>
                  </div>
                  <div className="wf-eyebrow" style={{ marginLeft: 22, marginTop: 2, fontSize: 9, color: 'inherit' }}>{step.en}</div>
                </div>
                <span className="ko" style={{ fontSize: 12, flexShrink: 0 }}>{complete ? '완료' : current ? '분석 중...' : '대기'}</span>
              </div>
            );
          })}
        </div>

        <p className="ko" style={{ margin: '28px 0 18px', textAlign: 'center', color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>
          확실하게 확인되는 특징을 중심으로<br />분석하고 있어요.
        </p>
        <div className="wf-loading-dots" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className="wf-loading-dot">
              <img src={mutedDot} alt="" width="8" height="8" />
              <img className="wf-loading-dot-active" src={activeDot} alt="" width="8" height="8" style={{ animationDelay: `${index * 0.4}s` }} />
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {onCancel && <button type="button" className="wf-btn-ghost" onClick={onCancel} style={{ width: 'auto', minWidth: 120 }}>분석 취소</button>}
      </main>
    </div>
  );
}
