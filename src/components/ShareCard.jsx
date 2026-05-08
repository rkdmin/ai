import { StatusBar } from './common/StatusBar';
import { BackHeader } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

// 공유 카드. result + card 를 props 로 받아 카드 본문에 반영.
// TODO: 실제 공유 동작(SAVE IMAGE = html2canvas → blob, INSTAGRAM/KAKAO = Web Share API)
//   현재는 버튼 클릭이 no-op.
export default function ShareCard({ result, card, variant = 'hair', onClose, onCopy, onSave }) {
  const isMakeup = variant === 'makeup';
  return (
    <div style={{ width: '100%', height: '100%', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <StatusBar dark />
      <BackHeader label="SHARE" title={isMakeup ? '메이크업 결과 공유' : '결과 공유'} onBack={onClose} dark />

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#fff', color: '#000', position: 'relative' }}>
          <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="wm" style={{ fontSize: 14, fontWeight: 300 }}>beaumi</span>
            <span className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>{isMakeup ? 'AI Makeup' : 'AI Beauty Coach'}</span>
          </div>

          {isMakeup ? <MakeupBody result={result} card={card} /> : <HairBody result={result} card={card} />}

          <div
            style={{
              padding: '10px 18px 14px', borderTop: '1px solid #000',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>beaumi.app</span>
            <div
              style={{
                width: 30, height: 30,
                background: 'repeating-conic-gradient(#000 0 25%,#fff 0 50%) 50% 50% / 6px 6px',
                border: '1px solid #000',
              }}
            />
          </div>
        </div>

        <button
          onClick={onSave}
          style={{
            background: '#fff', color: '#000', border: 'none', padding: '14px 0',
            fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer',
          }}
        >
          SAVE IMAGE
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <ShareButton label="INSTAGRAM" icon={Icons.insta} />
          <ShareButton label="KAKAO" />
          <ShareButton label="COPY LINK" icon={Icons.link} onClick={onCopy} />
        </div>
        <div style={{ height: 14 }} />
      </div>
    </div>
  );
}

function ShareButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '12px 0',
        border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'rgba(255,255,255,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
      }}
    >
      {icon ? icon(14, 'rgba(255,255,255,.7)') : <span style={{ fontFamily: 'Jost', fontSize: 12, fontWeight: 500 }}>K</span>}
      <span className="label" style={{ fontSize: 9 }}>{label}</span>
    </button>
  );
}

function HairBody({ result, card }) {
  const label = result?.styleLabel || '봄날의 햇살형';
  const subEn = result?.faceTypeEn || 'egg shape · spring warm';
  const tags = card?.name
    ? [card.name, '우아한 분위기 룩', 'ELEGANT MOOD']
    : ['쿠션 단발', '우아한 분위기 룩', 'ELEGANT MOOD'];
  return (
    <>
      <div style={{ padding: '14px 18px 18px', textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>
        <div className="ko" style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-.015em', lineHeight: 1.15 }}>{label}</div>
        <div className="serif-i" style={{ fontSize: 13, color: '#5a5a5a', marginTop: 6 }}>{subEn}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ aspectRatio: '1/1.1', borderRight: '1px solid #e8e8e8', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="light" label="" />
          <span className="label" style={{ position: 'absolute', top: 8, left: 10, fontSize: 9 }}>BEFORE</span>
        </div>
        <div style={{ aspectRatio: '1/1.1', background: '#f6f1ed', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="light" label="" />
          <span className="label" style={{ position: 'absolute', top: 8, left: 10, fontSize: 9 }}>AFTER</span>
        </div>
      </div>
      <div
        style={{ padding: '12px 18px', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid #e8e8e8' }}
      >
        <div style={{ display: 'flex' }}>
          {[
            ['#f3d9c8', '#c97b6e'],
            ['#ede2d0', '#a8896f'],
            ['#e0d4c4', '#7a6549'],
          ].map((cs, i) => (
            <div
              key={i}
              style={{
                width: 22, height: 22, borderRadius: 11,
                marginLeft: i > 0 ? -6 : 0,
                background: `radial-gradient(circle at 30% 30%, ${cs[1]} 0%, ${cs[0]} 70%)`,
                border: '1px solid #fff',
              }}
            />
          ))}
        </div>
        <span className="ko" style={{ fontSize: 11, fontWeight: 300 }}>
          {(result?.moodArchetype || ['ROMANTIC', 'CLEAN', 'SOFT']).join(' · ')}
        </span>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tags.map((t, i) => (
          <span
            key={i}
            className="label"
            style={{
              padding: '4px 8px', border: '1px solid #000',
              background: i === 0 ? '#000' : '#fff', color: i === 0 ? '#fff' : '#000',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </>
  );
}

function MakeupBody({ result, card }) {
  const name = card?.name || '우아한 분위기 룩';
  const faceType = result?.faceType || '계란형';
  return (
    <>
      <div style={{ padding: '12px 18px 14px', borderBottom: '1px solid #e8e8e8' }}>
        <div className="ko" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.01em', marginBottom: 4 }}>{name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300 }}>ELEGANT · Semi-Glow</span>
          <span className="label" style={{ padding: '1px 6px', border: '1px solid #000', fontSize: 9 }}>{faceType}</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e8e8' }}>
        <div className="label" style={{ marginBottom: 10 }}>COLOR PALETTE</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {[
            { p: 'BASE', c: '#f5e6d3' },
            { p: 'BLUSH', c: '#e8a89c' },
            { p: 'LIPS', c: '#c97b6e' },
            { p: 'EYES', c: '#8b7355' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ aspectRatio: '1/1', background: s.c }} />
              <span className="label" style={{ fontSize: 8.5, textAlign: 'center' }}>{s.p}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <div className="label" style={{ marginBottom: 8 }}>PERSONAL FIT</div>
        {[
          ['입체적인 골격', '앞볼 집중 블러셔'],
          ['부드러운 눈매', '꼬리 올린 아이라인'],
          ['균형잡힌 비율', '누드 그라데이션 립'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 11 }}>
            <span className="ko" style={{ fontWeight: 300 }}>{r[0]}</span>
            <span className="ko" style={{ fontWeight: 500 }}>→ {r[1]}</span>
          </div>
        ))}
      </div>
    </>
  );
}
