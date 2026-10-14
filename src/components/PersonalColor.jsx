// 사용자가 알고 있는 퍼스널컬러를 선택받는 화면.
// 선택값(spring/summer/autumn/winter)은 onNext(pick) 으로 전달되어 분석에 활용됨.
// TODO: 미선택(skip) 시 분석 결과를 바탕으로 백엔드가 추정한 퍼스널컬러를 사용.
import { useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';

const OPTIONS = [
  { id: 'spring', kr: '봄 웜톤', en: 'SPRING WARM', swatch: ['#f9d4a0', '#f5b888', '#e89870', '#d97050'] },
  { id: 'summer', kr: '여름 쿨톤', en: 'SUMMER COOL', swatch: ['#cde2ed', '#b8d0e0', '#a8b8c8', '#8090a8'] },
  { id: 'autumn', kr: '가을 웜톤', en: 'AUTUMN WARM', swatch: ['#d8a87a', '#c8845a', '#8b5a3a', '#604030'] },
  { id: 'winter', kr: '겨울 쿨톤', en: 'WINTER COOL', swatch: ['#a0b0c8', '#7090b8', '#405888', '#202840'] },
];

export default function PersonalColor({ onNext, onBack }) {
  const [pick, setPick] = useState(null);
  return (
    <div className="wf-screen">
      <StatusBar />
      <BackHeader title="퍼스널컬러" onBack={onBack} />

      <main className="wf-scroll" style={{ padding: '24px 20px 20px' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-.025em' }}>
          알고 있는<br />퍼스널컬러가 있나요?
        </h1>
        <p className="ko" style={{ margin: '12px 0 20px', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
          알려주시면 추천에 반영해요. 모르신다면 건너뛰셔도 좋아요.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {OPTIONS.map((o) => {
            const selected = pick === o.id;
            return (
              <button
                type="button"
                key={o.id}
                onClick={() => setPick(o.id)}
                aria-pressed={selected}
                className="wf-card tappable"
                style={{
                  padding: 12,
                  borderColor: selected ? 'var(--color-text)' : 'var(--color-line)',
                  background: selected ? 'var(--color-text)' : 'var(--color-bg)',
                  color: selected ? '#fff' : 'var(--color-text)',
                  display: 'flex', flexDirection: 'column', gap: 12, minHeight: 132,
                  textAlign: 'left', cursor: 'pointer',
                  transition: 'background-color .14s ease, color .14s ease, border-color .14s ease',
                }}
              >
                <div style={{ display: 'flex', height: 34, width: '100%', borderRadius: 4, overflow: 'hidden' }}>
                  {o.swatch.map((s) => <span key={s} style={{ flex: 1, background: s }} />)}
                </div>
                <div>
                  <div className="wf-eyebrow" style={{ color: selected ? 'rgba(255,255,255,.65)' : 'var(--color-text-subtle)', marginBottom: 4 }}>{o.en}</div>
                  <div className="ko" style={{ fontSize: 14, fontWeight: 700 }}>{o.kr}</div>
                </div>
                {selected && <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>{Icons.check(16, '#fff')}</div>}
              </button>
            );
          })}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--color-line)', padding: '16px 20px max(env(safe-area-inset-bottom), 20px)', background: 'var(--color-bg)', flexShrink: 0 }}>
        <button type="button" className="wf-btn-primary" onClick={() => onNext?.(pick)}>선택하고 분석하기</button>
        <button type="button" className="wf-btn-ghost" onClick={() => onNext?.(null)}>잘 모르겠어요 · 건너뛰기</button>
      </footer>
    </div>
  );
}
