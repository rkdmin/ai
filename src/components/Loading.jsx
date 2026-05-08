import { useEffect, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

const DEFAULT_STEPS = [
  { label: '얼굴 인식', en: 'FACE DETECTION' },
  { label: '얼굴형 분석', en: 'SHAPE ANALYSIS' },
  { label: '특징 추출', en: 'FEATURE MAPPING' },
  { label: '카드 큐레이션', en: 'CURATION' },
];

export default function Loading({ onNext, onCancel, label = '분석 중', steps }) {
  const s = steps || DEFAULT_STEPS;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => {
        if (i >= s.length) {
          clearInterval(t);
          onNext?.();
          return i;
        }
        return i + 1;
      });
    }, 1200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 22px 14px', flexShrink: 0 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="cancel">
          {Icons.close(20)}
        </button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ margin: '40px 24px 0', position: 'relative', aspectRatio: '1/1.1' }}>
        <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${20 + idx * 15}%`,
            height: 2,
            background: 'linear-gradient(90deg,transparent,#fff,transparent)',
            transition: 'top .8s',
          }}
        />
        <div className="serif-i" style={{ position: 'absolute', top: 14, left: 16, fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
          analyzing…
        </div>
        <div className="label" style={{ position: 'absolute', top: 16, right: 16, color: 'rgba(255,255,255,.5)' }}>
          nº 01
        </div>
      </div>

      <div style={{ padding: '30px 24px 0' }}>
        <div className="label" style={{ marginBottom: 8 }}>{label.toUpperCase()}</div>
        <div className="ko" style={{ fontSize: 18, fontWeight: 300, marginBottom: 22 }}>
          {idx < s.length ? s[idx].label : '완료'}{' '}
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
                {i < idx && Icons.check(16, '#000')}
                {i === idx && (
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
                {i > idx && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d4d4d4' }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: '0 24px 30px', textAlign: 'center', flexShrink: 0 }}>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '10px 0',
            fontFamily: 'Pretendard',
            fontSize: 12,
            color: '#a8a8a8',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          분석 취소
        </button>
      </div>
    </div>
  );
}
