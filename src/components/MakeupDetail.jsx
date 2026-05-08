import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { BackHeader, Section } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

// 메이크업 카드 상세. card.name / card.rank / card.sub 만 props 로 받고,
// 컬러 팔레트·파트별 가이드·추천 제품은 mock — Gemini 응답 + 쿠팡파트너스 매핑
// 후 필드(palette, partGuide, recommendedProducts) 로 교체.
// TODO: card.recommendedProducts 가 있으면 그걸 사용; 현재는 PRODUCTS_MOCK.
const PALETTE = [
  { part: 'BASE', kr: '베이스', c: '#f5e6d3', sub: 'Semi-Glow' },
  { part: 'BLUSH', kr: '블러셔', c: '#e8a89c', sub: 'Coral Nude' },
  { part: 'LIPS', kr: '립', c: '#c97b6e', sub: 'Nude Rose' },
  { part: 'EYES', kr: '아이', c: '#8b7355', sub: 'Warm Brown' },
];

const FALLBACK_FIT = [
  { kw: '입체적인 골격', target: '블러셔', point: '앞볼 중앙에 좁게 → 시선 집중' },
  { kw: '부드러운 눈매', target: '아이라인', point: '꼬리만 살짝 올려 도도한 인상' },
  { kw: '균형잡힌 비율', target: '전체', point: '원포인트 강조 메이크업이 정답' },
];

const PARTS = [
  { part: '베이스', tip: 'Semi-Glow · 결광 살리기', why: '균형잡힌 비율에 윤광이 자연스러워요' },
  { part: '쉐딩', tip: '눈두덩이 · 코 벽 음영 연결', why: '입체적 골격을 더 선명하게' },
  { part: '하이라이터', tip: 'C존 · 광대 위 은은한 윤광', why: '부드러운 눈매와 시너지' },
  { part: '블러셔', tip: '광대 감싸듯 넓은 타원형', why: '앞볼 집중으로 시선 모음' },
  { part: '아이브로우', tip: '내추럴 아치형', why: '직선 눈썹은 답답해 보일 수' },
  { part: '립', tip: 'Glow / Satin · 누드 그라데', why: '우아한 분위기와 가장 잘 맞아요' },
];

const PRODUCTS_MOCK = [
  { tag: 'BASE', name: '클리오 킬커버 파운웨어 쿠션', price: '28,000원' },
  { tag: 'LIPS', name: '롬앤 쥬시 래스팅 틴트', price: '12,000원' },
  { tag: 'EYES', name: '에뛰드 플레이 컬러 아이즈', price: '15,000원' },
];

export default function MakeupDetail({ card, onBack, onShare, onSynthesize }) {
  const name = card?.name || '우아한 분위기 룩';
  const rank = card?.rank ?? 1;
  const commentary =
    card?.commentary ||
    '계란형의 균형잡힌 비율은 Semi-Glow 베이스가 가장 자연스러워요. 과하지 않은 윤광으로 피부 생기를 살리고, 넓은 블러셔로 자연스러운 혈색을 더하면 우아하면서도 도도한 ELEGANT 무드를 만들 수 있어요.';
  const fit = card?.personalFit || FALLBACK_FIT;
  const products = (card?.recommendedProducts && card.recommendedProducts.length) ? card.recommendedProducts : PRODUCTS_MOCK;
  const headerLabel = `MAKEUP · nº 0${Math.max(rank, 1)}`;

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
        <div style={{ aspectRatio: '1/.95', background: '#000', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="dark" label="reference look" />
          <div
            style={{
              position: 'absolute', top: 14, left: 14, padding: '6px 10px',
              background: '#fff', color: '#000',
              display: 'flex', alignItems: 'baseline', gap: 4, zIndex: 2,
            }}
          >
            <span className="serif-i" style={{ fontSize: 20, fontWeight: 300, lineHeight: 1 }}>{rank}</span>
            <span className="label" style={{ fontSize: 9, letterSpacing: '.22em' }}>
              {rank === 1 ? 'ST' : rank === 2 ? 'ND' : rank === 3 ? 'RD' : 'TH'}
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="serif-i" style={{ fontSize: 22, color: '#fff', lineHeight: 1 }}>{rank}</span>
              <span className="label" style={{ color: 'rgba(255,255,255,.75)' }}>
                {rank === 1 ? 'ST · BEST MATCH' : `${rank}TH`}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />
              <span className="label" style={{ color: 'rgba(255,255,255,.6)' }}>SEMI-GLOW</span>
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

        <Section n="02" en="COLOR PALETTE" kr="이 룩의 컬러 팔레트">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, border: '1px solid #000' }}>
            {PALETTE.map((p, i) => (
              <div key={i} style={{ borderRight: i < 3 ? '1px solid #000' : 'none' }}>
                <div style={{ aspectRatio: '1/1', background: p.c }} />
                <div style={{ padding: '10px 10px 12px' }}>
                  <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>{p.part}</div>
                  <div className="ko" style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{p.kr}</div>
                  <div className="serif-i" style={{ fontSize: 10.5, color: '#7a7a7a' }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="03" en="PERSONAL FIT" kr="내 얼굴 특징 맞춤 포인트">
          {fit.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 14, padding: '14px 0',
                borderBottom: i < fit.length - 1 ? '1px solid #e8e8e8' : 'none',
                alignItems: 'flex-start',
              }}
            >
              <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22, flexShrink: 0 }}>0{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span className="ko" style={{ fontSize: 13, fontWeight: 500 }}>{f.kw}</span>
                  {f.target && <span className="label" style={{ fontSize: 9, padding: '1px 6px', border: '1px solid #000' }}>{f.target}</span>}
                </div>
                <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.6 }}>↳ {f.point}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section n="04" en="PART GUIDE" kr="파트별 가이드">
          <div style={{ borderTop: '1px solid #000' }}>
            {PARTS.map((p, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < PARTS.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span className="label" style={{ width: 60, flexShrink: 0, fontSize: 9.5 }}>{p.part}</span>
                  <span className="ko" style={{ fontSize: 13, fontWeight: 400 }}>{p.tip}</span>
                </div>
                <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300, paddingLeft: 72, lineHeight: 1.5 }}>
                  ↳ {p.why}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section n="05" en="PRODUCTS" kr="이 룩에 추천하는 제품" last>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid #000' }}>
            {products.map((p, i) => (
              <a
                key={i}
                href={p.coupangPartnersUrl || undefined}
                target={p.coupangPartnersUrl ? '_blank' : undefined}
                rel={p.coupangPartnersUrl ? 'noopener noreferrer' : undefined}
                style={{
                  display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid #e8e8e8',
                  alignItems: 'center', textDecoration: 'none', color: 'inherit',
                  cursor: p.coupangPartnersUrl ? 'pointer' : 'default',
                }}
              >
                <div style={{ width: 60, height: 60, background: '#0e0e0e', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 1px, transparent 1px 8px)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="label" style={{ fontSize: 9, marginBottom: 4 }}>{p.tag || p.slot?.toUpperCase()}</div>
                  <div className="ko" style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{p.name || p.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="serif-i" style={{ fontSize: 13 }}>{p.price || ''}</span>
                    <span className="ko" style={{ fontSize: 11, color: '#7a7a7a' }}>쿠팡 →</span>
                  </div>
                </div>
              </a>
            ))}
            <button
              onClick={onSynthesize}
              style={{
                padding: '14px 0', background: '#fff', border: '1px dashed #000', borderTop: 'none',
                fontFamily: 'Pretendard', fontSize: 12, color: '#5a5a5a', cursor: 'pointer',
              }}
            >
              + 파트별 추천 제품 더보기 (쿠팡)
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
