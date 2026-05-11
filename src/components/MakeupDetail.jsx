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

const PART_LABELS = [
  { key: 'shading', en: 'SHADING', kr: '쉐딩' },
  { key: 'highlight', en: 'HIGHLIGHT', kr: '하이라이트' },
  { key: 'blush', en: 'BLUSH', kr: '블러셔' },
  { key: 'eyebrow', en: 'EYEBROW', kr: '아이브로우' },
  { key: 'lip', en: 'LIP', kr: '립' },
  { key: 'eyeshadow', en: 'EYESHADOW', kr: '아이섀도우' },
  { key: 'eyeliner', en: 'EYELINER', kr: '아이라이너' },
];

function buildPartGuide(makeup) {
  if (!makeup) return [];
  const out = [];
  for (const p of PART_LABELS) {
    const tip = makeup[p.key];
    if (!tip) continue;
    out.push({ part: p.kr, en: p.en, tip, why: makeup[`${p.key}Reason`] || null });
  }
  return out;
}

const PRODUCTS_MOCK = [
  { tag: 'BASE', name: '클리오 킬커버 파운웨어 쿠션', price: '28,000원' },
  { tag: 'LIPS', name: '롬앤 쥬시 래스팅 틴트', price: '12,000원' },
  { tag: 'EYES', name: '에뛰드 플레이 컬러 아이즈', price: '15,000원' },
];

export default function MakeupDetail({ card, result, photoUrl, onBack, onShare, onSynthesize }) {
  const name = card?.name || '추천 메이크업';
  const rank = card?.rank ?? 1;
  const commentary = card?.commentary || card?.coachComment || '얼굴형과 퍼스널컬러를 기준으로 가장 자연스러운 메이크업이에요.';
  const fit = (card?.personalFit && card.personalFit.length) ? card.personalFit : FALLBACK_FIT;
  const products = (card?.recommendedProducts && card.recommendedProducts.length) ? card.recommendedProducts : PRODUCTS_MOCK;
  const headerLabel = `MAKEUP · nº 0${Math.max(rank, 1)}`;
  const featureTip = card?.featureTip;
  const moodLabel = card?.moodLabel;
  const baseSkin = card?.baseSkin;
  void result; void photoUrl; void onSynthesize; // 정책상 메이크업 카드는 합성 미지원 — props 호환 유지.

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 76 }}>
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
              {baseSkin && (
                <>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />
                  <span className="label" style={{ color: 'rgba(255,255,255,.6)' }}>{baseSkin.toUpperCase()}</span>
                </>
              )}
            </div>
            <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.01em' }}>{name}</div>
            {moodLabel && (
              <div className="ko" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', fontWeight: 300, marginTop: 4 }}>
                {moodLabel}
              </div>
            )}
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
          {featureTip && (
            <div style={{ background: '#fff', border: '1px solid #000', padding: '12px 14px', marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 4, color: '#7a7a7a' }}>FEATURE TIP</div>
              <div className="ko" style={{ fontSize: 12.5, fontWeight: 400, lineHeight: 1.6 }}>{featureTip}</div>
            </div>
          )}
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
            {(() => {
              const partGuide = buildPartGuide(card?.makeup);
              if (!partGuide.length) {
                return (
                  <div style={{ padding: '14px 0', color: '#7a7a7a' }} className="ko">
                    파트별 가이드를 불러오지 못했어요.
                  </div>
                );
              }
              return partGuide.map((p, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < partGuide.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                    <span className="label" style={{ width: 76, flexShrink: 0, fontSize: 9.5 }}>{p.en}</span>
                    <span className="ko" style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.4 }}>{p.tip}</span>
                  </div>
                  {p.why && (
                    <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300, paddingLeft: 88, lineHeight: 1.5 }}>
                      ↳ {p.why}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </Section>

        <Section n="05" en="PRODUCTS" kr="이 룩에 추천하는 제품" last>
          {/* 공정거래위원회 추천·보증 심사지침 + 쿠팡파트너스 운영정책에 따른 사전 고지.
              상품 링크와 같은 화면 안에 명확히 노출되어야 한다. */}
          <div
            role="note"
            aria-label="제휴 활동 고지"
            style={{
              padding: '10px 12px',
              border: '1px solid #d4d4d4',
              background: '#fafaf8',
              marginBottom: 12,
              fontSize: 11,
              lineHeight: 1.55,
              color: '#5a5a5a',
              fontWeight: 300,
            }}
            className="ko"
          >
            <span className="label" style={{ display: 'inline-block', marginRight: 6, color: '#000' }}>AD · 제휴</span>
            이 페이지의 제품 링크는 쿠팡파트너스 활동의 일환으로, 일정액의 수수료를 제공받습니다.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid #000' }}>
            {products.map((p, i) => (
              <a
                key={i}
                href={p.coupangPartnersUrl || undefined}
                target={p.coupangPartnersUrl ? '_blank' : undefined}
                rel={p.coupangPartnersUrl ? 'noopener noreferrer' : undefined}
                className={p.coupangPartnersUrl ? 'tappable' : undefined}
                style={{
                  display: 'flex', gap: 14, padding: '14px 4px', borderBottom: '1px solid #e8e8e8',
                  alignItems: 'center', textDecoration: 'none', color: 'inherit',
                  minHeight: 76,
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

      <div
        style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #000',
          padding: '10px 14px max(env(safe-area-inset-bottom), 14px)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          aria-label="다른 카드 보기"
          style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '12px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.18em', cursor: 'pointer', minHeight: 48 }}
        >
          OTHER LOOKS
        </button>
        <button
          onClick={onShare}
          aria-label="메이크업 결과 공유"
          style={{ flex: 2, background: '#000', color: '#fff', border: 'none', padding: '12px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {Icons.share(13, '#fff')} SHARE LOOK
        </button>
      </div>
    </div>
  );
}
