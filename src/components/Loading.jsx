import { useEffect, useRef, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

const DEFAULT_STEPS = [
  { label: '얼굴 인식', en: 'FACE DETECTION' },
  { label: '얼굴형 분석', en: 'SHAPE ANALYSIS' },
  { label: '특징 추출', en: 'FEATURE MAPPING' },
  { label: '카드 큐레이션', en: 'CURATION' },
];

const STEP_INTERVAL_MS = 1100;

/**
 * 로딩 화면.
 * - `task` (optional): 백엔드 호출 promise. 끝나면 onSuccess/onError 호출.
 * - `task` 없으면 기존 데모 동작(steps 만큼 진행 후 onNext) — 사진 업로드 후가 아닌
 *   카드 생성 단계처럼 데이터가 이미 있는 흐름에서만 사용.
 *
 * 단계 애니메이션은 백엔드 응답이 도착할 때까지 마지막 단계에서 머무르고,
 * 응답이 오면 즉시 onSuccess. 에러는 onError.
 */
export default function Loading({
  task,
  onNext,
  onSuccess,
  onError,
  onCancel,
  label = '분석 중',
  steps,
  photoUrl,
}) {
  const s = steps || DEFAULT_STEPS;
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    let alive = true;
    const t = setInterval(() => {
      setIdx((i) => Math.min(i + 1, s.length - 1));
    }, STEP_INTERVAL_MS);

    if (task && typeof task.then === 'function') {
      task.then(
        (r) => {
          if (!alive || fired.current) return;
          fired.current = true;
          setIdx(s.length - 1);
          setDone(true);
          // 마지막 step 표시를 잠깐 보여준 뒤 콜백.
          setTimeout(() => alive && onSuccess?.(r), 220);
        },
        (e) => {
          if (!alive || fired.current) return;
          fired.current = true;
          onError?.(e);
        },
      );
    } else if (onNext) {
      // task 가 없는 데모/내부 전환 흐름. 모든 step 보여준 뒤 onNext.
      const total = setTimeout(() => {
        if (!alive || fired.current) return;
        fired.current = true;
        setIdx(s.length - 1);
        setDone(true);
        setTimeout(() => alive && onNext?.(), 220);
      }, STEP_INTERVAL_MS * (s.length + 1));
      return () => {
        alive = false;
        clearInterval(t);
        clearTimeout(total);
      };
    }
    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLabel = done ? '완료' : (s[idx]?.label || '');

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <button onClick={onCancel} className="icon-btn" style={{ marginRight: -6 }} aria-label="cancel">
          {Icons.close(20)}
        </button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ margin: '24px 24px 0', position: 'relative', aspectRatio: '1/1.05', overflow: 'hidden', background: '#000' }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            aria-hidden
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4) contrast(1.05) brightness(0.85)' }}
          />
        ) : (
          <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
        )}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${15 + Math.min(idx, s.length - 1) * 18}%`,
            height: 2,
            background: 'linear-gradient(90deg,transparent,#fff,transparent)',
            transition: 'top .8s',
          }}
        />
        <div className="serif-i" style={{ position: 'absolute', top: 14, left: 16, fontSize: 12, color: 'rgba(255,255,255,.55)' }}>
          analyzing…
        </div>
        <div className="label" style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,.55)' }}>
          nº 01
        </div>
      </div>

      <div style={{ padding: '24px 24px 0' }}>
        <div className="label" style={{ marginBottom: 8 }}>{label.toUpperCase()}</div>
        <div className="ko" style={{ fontSize: 18, fontWeight: 300, marginBottom: 22 }}>
          {currentLabel}{' '}
          <span className="serif-i" style={{ fontSize: 14, color: '#7a7a7a' }}>
            · {Math.min(idx + 1, s.length)} / {s.length}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid #e8e8e8' }}>
          {s.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid #e8e8e8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22 }}>
                  0{i + 1}
                </span>
                <div>
                  <div className="label" style={{ fontSize: 9.5, color: i <= idx ? '#000' : '#a8a8a8', marginBottom: 2 }}>
                    {step.en}
                  </div>
                  <div className="ko" style={{ fontSize: 12.5, color: i <= idx ? '#000' : '#a8a8a8' }}>
                    {step.label}
                  </div>
                </div>
              </div>
              <div>
                {(done || i < idx) && Icons.check(16, '#000')}
                {!done && i === idx && (
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      border: '1.2px solid #000',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                )}
                {!done && i > idx && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4d4d4' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '12px 24px max(env(safe-area-inset-bottom), 30px)', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <button
          onClick={onCancel}
          style={{
            background: '#fff',
            border: '1px solid #d4d4d4',
            padding: '10px 22px',
            fontFamily: 'Pretendard',
            fontSize: 12.5,
            color: '#5a5a5a',
            minHeight: 40,
          }}
        >
          분석 취소
        </button>
      </div>
    </div>
  );
}
