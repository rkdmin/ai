import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { BackHeader, Section } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

// 헤어 카드 상세. card.name / card.rank / card.sub 만 props 로 받고,
// 본문 섹션(코멘트·맞춤 피드백·무드보드)은 mock — Gemini 응답이 카드별 코멘트를
// 반환하도록 프롬프트가 보강되면 여기에 매핑.
// TODO: card.commentary / card.personalFit / card.moodBoard 필드를 백엔드 응답에 추가.
const FALLBACK_FIT = [
  { kw: '균형잡힌 비율', point: '턱선 ±2cm 길이가 가장 자연스러워요' },
  { kw: '부드러운 눈매', point: '안으로 말린 C컬로 시선 강조' },
  { kw: '좁은 이마', point: '시스루 뱅으로 이마 비율 보정' },
];

const FALLBACK_MOOD = [
  { kw: 'ROMANTIC', kr: '로맨틱', c1: '#f3d9c8', c2: '#c97b6e' },
  { kw: 'EFFORTLESS', kr: '내추럴', c1: '#ede2d0', c2: '#a8896f' },
  { kw: 'CLASSIC', kr: '클래식', c1: '#e0d4c4', c2: '#7a6549' },
];

export default function CardDetail({ card, onBack, onShare, onSynthesize }) {
  const name = card?.name || '쿠션 단발';
  const rank = card?.rank ?? 1;
  const commentary =
    card?.commentary ||
    '계란형 + 부드러운 눈매에 가장 잘 어울리는 길이는 턱선 ±2cm. 살짝 안으로 말린 C컬이 동그란 인상을 보완하고, 시스루 뱅으로 이마 비율을 조정하면 우아하면서도 청순한 ROMANTIC 무드가 완성돼요.';
  const fit = card?.personalFit || FALLBACK_FIT;
  const moodBoard = card?.moodBoard || FALLBACK_MOOD;
  const headerLabel = `HAIR · nº 0${Math.max(rank, 1)}`;

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader
        label={headerLabel}
        title={name}
        onBack={onBack}
        right={
          <button onClick={onShare} style={{ background: 'none', border: 'none', padding: 6, cursor: 'pointer' }} aria-label="share">
            {Icons.share(16)}
          </button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ aspectRatio: '1/1.05', background: '#000', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="dark" label="reference" />
          <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="serif-i" style={{ fontSize: 22, color: '#fff', lineHeight: 1 }}>{rank}</span>
              <span className="label" style={{ color: 'rgba(255,255,255,.7)' }}>
                {rankSuffix(rank)} · {rank === 1 ? 'BEST MATCH' : 'MATCH'}
              </span>
            </div>
            <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.01em' }}>{name}</div>
          </div>
        </div>

        <Section n="01" en="AI COMMENTARY" kr="AI 전문가 코멘트">
          <div style={{ background: '#f6f1ed', padding: '18px 18px', borderLeft: '2px solid #000' }}>
            <div className="ko" style={{ fontSize: 13.5, lineHeight: 1.75, color: '#1a1a1a', fontWeight: 300 }}>
              {commentary}
            </div>
          </div>
        </Section>

        <Section n="02" en="PERSONAL FIT" kr="내 얼굴 특징 맞춤 피드백">
          {fit.map((f, i) => (
            <div
              key={i}
              style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < fit.length - 1 ? '1px solid #e8e8e8' : 'none' }}
            >
              <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22, flexShrink: 0 }}>0{i + 1}</span>
              <div>
                <div className="ko" style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{f.kw}</div>
                <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.6 }}>↳ {f.point}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section n="03" en="MOOD BOARD" kr="이 헤어의 무드">
          <div style={{ display: 'flex', gap: 8 }}>
            {moodBoard.map((m, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ aspectRatio: '1/1.25', background: m.c1, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse at 50% 35%, ${m.c2} 0%, transparent 60%)` }} />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,.04) 0 1px, transparent 1px 8px)' }} />
                  <span className="label" style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 9, color: 'rgba(0,0,0,.7)' }}>{m.kw}</span>
                </div>
                <div className="ko" style={{ fontSize: 12, fontWeight: 500, marginTop: 8 }}>{m.kr}</div>
                <div className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>mood · {i + 1}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="04" en="AI SYNTHESIS" kr="내 얼굴에 합성해보기" last>
          <div style={{ background: '#000', color: '#fff', padding: '22px 20px 24px', position: 'relative' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 10, alignItems: 'center', marginBottom: 18 }}>
              <div style={{ aspectRatio: '1/1.2', position: 'relative' }}>
                <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
                <span className="label" style={{ position: 'absolute', top: 8, left: 10, color: 'rgba(255,255,255,.6)', fontSize: 9 }}>BEFORE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.arrow(20, '#fff')}</div>
              <div style={{ aspectRatio: '1/1.2', position: 'relative', border: '1px dashed rgba(255,255,255,.4)' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 1px, transparent 1px 10px)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icons.lock(14, 'rgba(255,255,255,.7)')}
                  </div>
                  <span className="serif-i" style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>after</span>
                </div>
                <span className="label" style={{ position: 'absolute', top: 8, left: 10, color: 'rgba(255,255,255,.5)', fontSize: 9 }}>AI SYNTHESIS</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="label" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>STEP 04 · TRY ON</div>
              <div className="ko" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-.01em', marginBottom: 6 }}>이 헤어, 내 얼굴엔 어떨까?</div>
              <div className="ko" style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 300, lineHeight: 1.6 }}>
                15초 광고를 보고 내 얼굴에 합성된 결과를 받아보세요.
              </div>
            </div>
            <button
              onClick={onSynthesize}
              style={{
                width: '100%', background: '#fff', color: '#000', border: 'none', padding: '14px 0',
                fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              {Icons.play(13)} WATCH AD &amp; SYNTHESIZE
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function rankSuffix(n) {
  return n === 1 ? '1ST' : n === 2 ? '2ND' : n === 3 ? '3RD' : `${n}TH`;
}
