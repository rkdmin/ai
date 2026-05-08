import { Icons } from './common/Icons';
import { Section, BackHeader } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

// Mood board palettes — abstract color references, NO celebrities
const MOOD_BOARDS = [
  { en: 'ROMANTIC', kr: '로맨틱', palette: ['#efd9d1', '#d8a5a0', '#a87060'] },
  { en: 'EFFORTLESS', kr: '에포트리스', palette: ['#f0ebe4', '#c9bba8', '#7a6a5a'] },
  { en: 'CLASSIC', kr: '클래식', palette: ['#1a1a1a', '#5a5a5a', '#d8c9bb'] },
];

export default function CardDetail({ card, type = 'hair', onBack, onShare, onSynthesize }) {
  const c = card || {
    rank: 1,
    name: type === 'hair' ? '쿠션 단발' : '엘레강트 리턴',
    sub: type === 'hair' ? 'C컬 · 시스루 뱅' : 'BLUSH 코랄 · LIPS MLBB',
  };
  const sectionLabel = type === 'hair' ? 'HAIR' : 'MAKEUP';

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000' }}>
      <BackHeader
        label={`${sectionLabel} · nº 0${c.rank || 1}`}
        title={c.name}
        onBack={onBack}
        right={<button onClick={onShare} style={{ background: 'none', border: 'none', padding: 6 }}>{Icons.share(16)}</button>}
      />

      <div>
        {/* Hero */}
        <div style={{ aspectRatio: '1/1.05', background: '#000', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="dark" label="reference" />
          <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="serif-i" style={{ fontSize: 22, color: '#fff', lineHeight: 1 }}>{c.rank || 1}</span>
              <span className="label" style={{ color: 'rgba(255,255,255,.7)' }}>ST · BEST MATCH</span>
            </div>
            <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.01em' }}>{c.name}</div>
          </div>
        </div>

        <Section n="01" en="AI COMMENTARY" kr="AI 전문가 코멘트">
          <div style={{ background: '#f6f1ed', padding: '18px 18px', borderLeft: '2px solid #000' }}>
            <div className="ko" style={{ fontSize: 13.5, lineHeight: 1.75, color: '#1a1a1a', fontWeight: 300 }}>
              {c.commentary || '계란형 + 부드러운 눈매에 가장 잘 어울리는 길이는 턱선 ±2cm. 살짝 안으로 말린 C컬이 동그란 인상을 보완하고, 시스루 뱅으로 이마 비율을 조정하면 우아한 분위기가 완성돼요.'}
            </div>
          </div>
        </Section>

        <Section n="02" en="PERSONAL FIT" kr="내 얼굴 특징 맞춤 피드백">
          {(c.fits || [
            { kw: '균형잡힌 비율', point: '턱선 ±2cm 길이가 가장 자연스러워요' },
            { kw: '부드러운 눈매', point: '안으로 말린 C컬로 시선 강조' },
            { kw: '좁은 이마', point: '시스루 뱅으로 이마 비율 보정' },
          ]).map((f, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
              <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22, flexShrink: 0 }}>0{i + 1}</span>
              <div>
                <div className="ko" style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{f.kw}</div>
                <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.6 }}>↳ {f.point}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section n="03" en="MOOD BOARD" kr="이 스타일의 무드">
          <div style={{ display: 'flex', gap: 8 }}>
            {MOOD_BOARDS.map((m, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ aspectRatio: '1/1.25', display: 'flex', flexDirection: 'column' }}>
                  {m.palette.map((color, j) => (
                    <div key={j} style={{ flex: 1, background: color }} />
                  ))}
                </div>
                <div className="ko" style={{ fontSize: 11, fontWeight: 500, marginTop: 8, letterSpacing: '0.15em' }}>{m.en}</div>
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
              <div className="ko" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-.01em', marginBottom: 6 }}>이 스타일, 내 얼굴엔 어떨까?</div>
              <div className="ko" style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 300, lineHeight: 1.6 }}>15초 광고를 보고 내 얼굴에 합성된 결과를 받아보세요.</div>
            </div>
            <button
              onClick={onSynthesize}
              style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              {Icons.play(13)} WATCH AD &amp; SYNTHESIZE
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
