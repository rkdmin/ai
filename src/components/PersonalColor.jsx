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
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader label="STEP 02 / 03" title="퍼스널컬러" onBack={onBack} />

      <div style={{ flex: 1, padding: '28px 24px 0', overflowY: 'auto' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 300, lineHeight: 1.32, letterSpacing: '-.01em' }}>
          알고 있는<br />퍼스널컬러가 있나요?
        </h1>
        <p className="ko" style={{ margin: '14px 0 24px', fontSize: 13, lineHeight: 1.7, color: '#5a5a5a', fontWeight: 300 }}>
          알려주시면 더 정확한 추천을 드려요. 모르신다면 건너뛰셔도 좋아요 — 마이 페이지에서 나중에 수정할 수 있어요.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #000' }}>
          {OPTIONS.map((o, i) => {
            const selected = pick === o.id;
            const br = i % 2 === 0 ? '1px solid #000' : 'none';
            const bb = i < 2 ? '1px solid #000' : 'none';
            return (
              <div
                key={o.id}
                onClick={() => setPick(o.id)}
                style={{
                  padding: '18px 16px', cursor: 'pointer',
                  borderRight: br, borderBottom: bb,
                  background: selected ? '#000' : '#fff',
                  color: selected ? '#fff' : '#000',
                  display: 'flex', flexDirection: 'column', gap: 14, minHeight: 140,
                }}
              >
                <div style={{ display: 'flex', gap: 0, height: 32 }}>
                  {o.swatch.map((s, j) => <div key={j} style={{ flex: 1, background: s }} />)}
                </div>
                <div>
                  <div className="label" style={{ color: selected ? 'rgba(255,255,255,.6)' : '#7a7a7a', marginBottom: 4 }}>{o.en}</div>
                  <div className="ko" style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-.005em' }}>{o.kr}</div>
                </div>
                {selected && <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>{Icons.check(16, '#fff')}</div>}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onNext?.(null)}
          style={{
            marginTop: 18, background: 'transparent', border: 'none', padding: '10px 0',
            fontFamily: 'Pretendard', fontSize: 13, color: '#7a7a7a', cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          잘 모르겠어요 — 건너뛰기
        </button>
      </div>

      <div style={{ padding: '18px 24px max(env(safe-area-inset-bottom), 30px)', borderTop: '1px solid #e8e8e8', display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.18em', cursor: 'pointer' }}
        >
          BACK
        </button>
        <button
          onClick={() => onNext?.(pick)}
          style={{ flex: 2, background: '#000', color: '#fff', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}
        >
          {pick ? 'START ANALYSIS →' : 'SKIP & ANALYZE →'}
        </button>
      </div>
    </div>
  );
}
