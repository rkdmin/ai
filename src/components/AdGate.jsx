import { useEffect, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder, ProductPlaceholder } from './common/Placeholders';

export default function AdGate({ onDone, onBack }) {
  const [stage, setStage] = useState('prompt');
  const [t, setT] = useState(15);

  useEffect(() => {
    if (stage !== 'ad') return;
    const id = setInterval(() => {
      setT((v) => {
        if (v <= 1) {
          clearInterval(id);
          setStage('unlocked');
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'unlocked') return;
    const tid = setTimeout(() => onDone?.(), 1400);
    return () => clearTimeout(tid);
  }, [stage, onDone]);

  if (stage === 'prompt') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
        <StatusBar />
        <BackHeader label="LOCKED" title="잠금 해제" onBack={onBack} />
        <div style={{ flex: 1, padding: '40px 28px 0', display: 'flex', flexDirection: 'column' }}>
          <div className="label" style={{ marginBottom: 14 }}>HAIR · nº 01 — LONG LAYERED</div>

          <div style={{ aspectRatio: '1/1', position: 'relative', marginBottom: 24, border: '1px solid #000' }}>
            <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,.7)',
                backdropFilter: 'blur(14px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  border: '1px solid #000',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {Icons.lock(22)}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="label" style={{ marginBottom: 6 }}>1ST · BEST MATCH</div>
                <div className="ko" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-.01em' }}>잠긴 카드</div>
              </div>
            </div>
          </div>

          <div className="ko" style={{ fontSize: 13.5, lineHeight: 1.7, color: '#1a1a1a', fontWeight: 300, marginBottom: 6 }}>
            15초 광고를 보고 카드 1장을 잠금 해제할 수 있어요.
          </div>
          <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', fontWeight: 300, marginBottom: 'auto' }}>
            광고 시청 후 자동으로 카드 상세로 이동합니다.
          </div>

          <div style={{ padding: '18px 0 30px', display: 'flex', gap: 10 }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                background: '#fff',
                color: '#000',
                border: '1px solid #000',
                padding: '14px 0',
                fontFamily: 'Pretendard',
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              나중에
            </button>
            <button
              onClick={() => setStage('ad')}
              style={{
                flex: 2,
                background: '#000',
                color: '#fff',
                border: 'none',
                padding: '14px 0',
                fontFamily: 'Jost',
                fontSize: 11,
                letterSpacing: '.22em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              {Icons.play(14, '#fff')} WATCH AD · 15s
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'ad') {
    return (
      <div style={{ width: '100%', height: '100%', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <StatusBar dark />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px 14px', flexShrink: 0 }}>
          <span className="label" style={{ color: 'rgba(255,255,255,.5)' }}>AD · {t}s</span>
          <span className="label" style={{ color: 'rgba(255,255,255,.3)' }}>SKIP UNAVAILABLE</span>
        </div>
        <div style={{ flex: 1, position: 'relative', background: '#0e0e0e' }}>
          <ProductPlaceholder w="100%" h="100%" label="ad creative" />
          <div style={{ position: 'absolute', bottom: 24, left: 22, right: 22, color: '#fff' }}>
            <div className="serif-i" style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
              sponsored content
            </div>
            <div className="ko" style={{ fontSize: 24, fontWeight: 300, lineHeight: 1.25, marginBottom: 8 }}>
              NEW · Cushion Foundation
            </div>
            <div className="ko" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 300 }}>
              5년 연속 NO.1 럭셔리 쿠션
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', background: '#000', flexShrink: 0 }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,.2)', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${((15 - t) / 15) * 100}%`,
                background: '#fff',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fff',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          border: '1px solid #000',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Icons.check(36)}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="label" style={{ marginBottom: 8 }}>UNLOCKED</div>
        <div className="ko" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.01em' }}>잠금이 풀렸어요</div>
        <div className="serif-i" style={{ fontSize: 13, color: '#7a7a7a', marginTop: 8 }}>opening card detail…</div>
      </div>
    </div>
  );
}
