import { useEffect, useState } from 'react';
import { Icons } from './common/Icons';

export default function AdGate({ onDone, onBack, durationSec = 15 }) {
  const [stage, setStage] = useState('prompt'); // prompt → ad → unlocked
  const [t, setT] = useState(durationSec);

  useEffect(() => {
    if (stage !== 'ad') return;
    const id = setInterval(() => setT((v) => {
      if (v <= 1) { clearInterval(id); setStage('unlocked'); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'unlocked') return;
    const tid = setTimeout(() => onDone?.(), 1400);
    return () => clearTimeout(tid);
  }, [stage, onDone]);

  if (stage === 'prompt') {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', padding: '14px 18px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', padding: 4 }}>{Icons.back(20)}</button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px' }}>
          <div className="label" style={{ marginBottom: 14, color: '#7a7a7a' }}>UNLOCK · WATCH AD</div>
          <div className="ko" style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 16 }}>
            {durationSec}초 광고를 보고<br />결과를 확인하세요
          </div>
          <div className="ko" style={{ fontSize: 13, color: '#7a7a7a', fontWeight: 300, lineHeight: 1.6, marginBottom: 36 }}>
            광고를 끝까지 보면 잠금이 해제됩니다.<br />중간에 종료하면 다시 시작해야 해요.
          </div>
          <button onClick={() => setStage('ad')} style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '16px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {Icons.play(13, '#fff')} START AD
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'ad') {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
          <span className="label" style={{ fontSize: 9, color: 'rgba(255,255,255,.5)' }}>SPONSORED</span>
          <span className="serif-i" style={{ fontSize: 14, color: 'rgba(255,255,255,.7)' }}>{t}s</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
          <div style={{ textAlign: 'center' }}>
            <div className="label" style={{ marginBottom: 12, color: 'rgba(255,255,255,.4)' }}>AD PLACEHOLDER</div>
            <div className="ko" style={{ fontSize: 32, fontWeight: 300, color: 'rgba(255,255,255,.6)' }}>광고 영역</div>
          </div>
        </div>
        <div style={{ padding: '14px 22px 24px' }}>
          <div style={{ height: 2, background: 'rgba(255,255,255,.15)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, right: `${(t / durationSec) * 100}%`, background: '#fff', transition: 'right 1s linear' }} />
          </div>
        </div>
      </div>
    );
  }

  // unlocked
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, border: '1px solid #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          {Icons.check(24)}
        </div>
        <div className="label" style={{ marginBottom: 8 }}>UNLOCKED</div>
        <div className="ko" style={{ fontSize: 18, fontWeight: 300 }}>잠금이 해제되었어요</div>
      </div>
    </div>
  );
}
