// TODO: 온보딩 노출 여부를 사용자 첫 방문 플래그(localStorage / Supabase)와 연동.
// 현재는 NEXT 버튼이 단순히 다음 단계로 이동.
import { StatusBar } from './common/StatusBar';
import { StepDots } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

const STEPS = [
  {
    label: 'STEP 01 · ANALYSIS',
    title: ['한 장의 사진으로', '얼굴형을 정확히'],
    desc: 'MediaPipe 기반 정밀 분석으로 6가지 얼굴형 중 당신에게 가장 가까운 형태를 찾아냅니다.',
    visual: <HeroVisual1 />,
  },
  {
    label: 'STEP 02 · CARDS',
    title: ['나를 닮은 얼굴,', '그리고 어울리는 룩'],
    desc: '감성 라벨, 무드 아키타입, 헤어·메이크업 추천 카드 4장을 받아보세요.',
    visual: <HeroVisual2 />,
  },
  {
    label: 'STEP 03 · PRODUCTS',
    title: ['추천 룩에 어울리는', '제품도 한 번에'],
    desc: '얼굴 특징과 컬러에 맞춘 베이스·립·아이 제품을 큐레이션 받고 바로 구매하세요.',
    visual: <HeroVisual3 />,
  },
];

export default function Onboarding({ idx = 0, onNext, onSkip }) {
  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px 14px', flexShrink: 0 }}>
        <span className="wm" style={{ fontSize: 18, fontWeight: 300 }}>beaumi</span>
        {!isLast && (
          <span
            onClick={onSkip}
            style={{ fontFamily: 'Pretendard', fontSize: 12, color: '#7a7a7a', cursor: 'pointer' }}
          >
            건너뛰기 →
          </span>
        )}
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ flex: '0 0 360px', position: 'relative', overflow: 'hidden', background: '#000' }}>
        {step.visual}
        <div className="serif-i" style={{ position: 'absolute', top: 18, right: 22, color: 'rgba(255,255,255,.5)', fontSize: 13 }}>
          nº 0{idx + 1}
        </div>
      </div>

      <div style={{ flex: 1, padding: '34px 28px 0', display: 'flex', flexDirection: 'column' }}>
        <div className="label" style={{ color: '#000', marginBottom: 18 }}>{step.label}</div>
        <h1 className="ko" style={{ margin: 0, fontSize: 28, fontWeight: 300, lineHeight: 1.3, letterSpacing: '-.01em' }}>
          {step.title[0]}<br />{step.title[1]}
        </h1>
        <p className="ko" style={{ margin: '18px 0 0', fontSize: 13.5, lineHeight: 1.7, color: '#5a5a5a', fontWeight: 300, maxWidth: 300 }}>
          {step.desc}
        </p>
      </div>

      <div style={{ padding: '24px 28px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <StepDots total={3} current={idx} />
        <button
          onClick={onNext}
          style={{
            background: '#000', color: '#fff', border: 'none', padding: '13px 22px',
            fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', fontWeight: 500, cursor: 'pointer',
          }}
        >
          {isLast ? 'GET STARTED' : 'NEXT'}
        </button>
      </div>
    </div>
  );
}

function HeroVisual1() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
      <svg width="100%" height="100%" viewBox="0 0 390 360" style={{ position: 'absolute', inset: 0 }}>
        <g stroke="#d4b07a" strokeWidth=".8" fill="none" opacity=".7">
          <line x1="195" y1="80" x2="195" y2="280" strokeDasharray="2 4" />
          <line x1="120" y1="180" x2="270" y2="180" strokeDasharray="2 4" />
          <ellipse cx="195" cy="180" rx="68" ry="92" />
        </g>
        <g fill="#d4b07a">
          {[[150, 140], [195, 135], [240, 140], [170, 170], [220, 170], [195, 200], [170, 220], [195, 225], [220, 220]].map(
            ([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" />,
          )}
        </g>
        <text x="20" y="30" fill="rgba(212,176,122,.7)" fontFamily="Jost" fontSize="9" letterSpacing="2">FACIAL LANDMARKS · 468 PT</text>
        <text x="20" y="345" fill="rgba(255,255,255,.4)" fontFamily="Cormorant Garamond" fontSize="14" fontStyle="italic">precision analysis</text>
      </svg>
    </div>
  );
}

function HeroVisual2() {
  const cards = [
    { bg: '#f6f1ed', x: -68, y: 18, rot: -8, label: '01', t: '봄날의 햇살형' },
    { bg: '#fff', x: 0, y: 0, rot: 0, label: '02', t: '우아한 분위기' },
    { bg: '#1f1d1b', color: '#fff', x: 68, y: 18, rot: 8, label: '03', t: 'ELEGANT MOOD' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#1a1a1a,#000)' }} />
      <svg width="100%" height="100%" viewBox="0 0 390 360" style={{ position: 'absolute', inset: 0 }}>
        <text x="20" y="30" fill="rgba(255,255,255,.4)" fontFamily="Jost" fontSize="9" letterSpacing="2">CURATED · 4 CARDS</text>
      </svg>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', width: 140, height: 200, background: c.bg, color: c.color || '#000',
            transform: `translate(${c.x}px,${c.y}px) rotate(${c.rot}deg)`,
            boxShadow: '0 14px 30px rgba(0,0,0,.4)',
            padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}
        >
          <div className="serif-i" style={{ fontSize: 11, opacity: 0.6 }}>nº {c.label}</div>
          <div>
            <div
              style={{
                aspectRatio: '1/1', width: '100%',
                background: c.color ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
                marginBottom: 10,
                backgroundImage: `repeating-linear-gradient(135deg, rgba(${c.color ? '255,255,255' : '0,0,0'},.05) 0 1px, transparent 1px 8px)`,
              }}
            />
            <div className="ko" style={{ fontSize: 12, fontWeight: 500 }}>{c.t}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeroVisual3() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0e0e0e' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 1px, transparent 1px 14px)' }} />
      <svg width="100%" height="100%" viewBox="0 0 390 360" style={{ position: 'absolute', inset: 0 }}>
        <text x="20" y="30" fill="rgba(255,255,255,.4)" fontFamily="Jost" fontSize="9" letterSpacing="2">CURATED PRODUCTS · COUPANG</text>
      </svg>
      <div style={{ position: 'absolute', left: 60, top: 80, width: 130, height: 130, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #d4b07a, #6b4f2b 60%, #3a2914)', boxShadow: 'inset 0 0 0 6px #1a1209, 0 12px 30px rgba(0,0,0,.5)' }} />
      <div style={{ position: 'absolute', left: 90, top: 115, width: 80, height: 80, borderRadius: '50%', background: '#0a0a0a', border: '4px solid #2a1f12', boxShadow: '0 8px 16px rgba(0,0,0,.6)' }} />
      <div style={{ position: 'absolute', right: 80, top: 90, width: 30, height: 120, background: 'linear-gradient(180deg,#2a1f12 0%,#2a1f12 35%,#c97b6e 35%,#c97b6e 100%)', borderRadius: '4px 4px 2px 2px', boxShadow: '0 8px 18px rgba(0,0,0,.5)' }} />
      <div style={{ position: 'absolute', right: 60, bottom: 80, width: 130, height: 80, background: '#1a1a1a', border: '2px solid #2a1f12', borderRadius: 4, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, boxShadow: '0 10px 24px rgba(0,0,0,.5)' }}>
        {['#f5e6d3', '#e8a89c', '#c97b6e', '#8b7355', '#d9b89c', '#a87060', '#604030', '#3a2418'].map((c, i) => (
          <div key={i} style={{ background: c, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ position: 'absolute', left: 60, bottom: 30, fontFamily: 'Cormorant Garamond', fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,.5)' }}>your match, in one tap</div>
    </div>
  );
}
