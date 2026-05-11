import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { BackHeader, Section } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

// 헤어 카드 상세. mappers.mapHairCard 가 정규화한 카드를 받는다.
// card.commentary / card.personalFit / card.moodBoard / card.featureTip 를 그대로 사용하고,
// 백엔드 응답에서 빠진 부분은 짧은 fallback 으로 채운다.
const FALLBACK_FIT = [
  { kw: '균형잡힌 비율', point: '얼굴형에 맞춰 길이를 조정해보세요' },
  { kw: '이목구비 균형', point: '앞머리 비율로 인상을 조정' },
];

const FALLBACK_MOOD = [
  { kw: 'CLEAN', kr: '클린', c1: '#f5e6d3', c2: '#d4a574' },
  { kw: 'CLASSIC', kr: '클래식', c1: '#e0d4c4', c2: '#7a6549' },
];

export default function CardDetail({ card, result, photoUrl, synthesizedPhoto, onBack, onShare, onSynthesize }) {
  const name = card?.name || '추천 헤어';
  const rank = card?.rank ?? 1;
  const commentary = card?.commentary || card?.coachComment || '얼굴형 분석 결과를 기준으로 가장 자연스러운 헤어 스타일이에요.';
  const fit = (card?.personalFit && card.personalFit.length) ? card.personalFit : FALLBACK_FIT;
  const moodBoard = (card?.moodBoard && card.moodBoard.length) ? card.moodBoard : FALLBACK_MOOD;
  const headerLabel = `HAIR · nº 0${Math.max(rank, 1)}`;
  const featureTip = card?.featureTip;
  const moodLabel = card?.moodLabel;

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
        <div style={{ aspectRatio: '1/1.05', background: '#000', position: 'relative' }}>
          <FacePlaceholder w="100%" h="100%" tone="dark" label="reference" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.85) 100%)' }} />
          {moodLabel && (
            <span className="label" style={{ position: 'absolute', top: 16, left: 18, color: 'rgba(255,255,255,.65)' }}>
              {moodLabel}
            </span>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: 18, right: 18, color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span className="serif-i" style={{ fontSize: 22, color: '#fff', lineHeight: 1 }}>{rank}</span>
              <span className="label" style={{ color: 'rgba(255,255,255,.7)' }}>
                {rankSuffix(rank)} · {rank === 1 ? 'BEST MATCH' : 'MATCH'}
              </span>
            </div>
            <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.01em', marginBottom: card?.bangs && card.bangs !== '없음' ? 6 : 0 }}>{name}</div>
            {card?.bangs && card.bangs !== '없음' && (
              <div className="ko" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', fontWeight: 300 }}>앞머리 · {card.bangs}</div>
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

        <Section n="02" en="PERSONAL FIT" kr="내 얼굴 특징 맞춤 피드백">
          {featureTip && (
            <div style={{ background: '#fff', border: '1px solid #000', padding: '12px 14px', marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 4, color: '#7a7a7a' }}>FEATURE TIP</div>
              <div className="ko" style={{ fontSize: 12.5, fontWeight: 400, lineHeight: 1.6 }}>{featureTip}</div>
            </div>
          )}
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
              <div style={{ aspectRatio: '1/1.2', position: 'relative', overflow: 'hidden' }}>
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    decoding="async"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.2)' }}
                  />
                ) : (
                  <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
                )}
                <span className="label" style={{ position: 'absolute', top: 8, left: 10, color: 'rgba(255,255,255,.6)', fontSize: 9 }}>BEFORE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.arrow(20, '#fff')}</div>
              <div style={{ aspectRatio: '1/1.2', position: 'relative', border: synthesizedPhoto ? '1px solid rgba(255,255,255,.6)' : '1px dashed rgba(255,255,255,.4)', overflow: 'hidden' }}>
                {synthesizedPhoto ? (
                  <img
                    src={synthesizedPhoto}
                    alt="AI 합성 결과"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 1px, transparent 1px 10px)' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <div style={{ width: 34, height: 34, border: '1px solid rgba(255,255,255,.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {Icons.lock(14, 'rgba(255,255,255,.7)')}
                      </div>
                      <span className="serif-i" style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>after</span>
                    </div>
                  </>
                )}
                <span className="label" style={{ position: 'absolute', top: 8, left: 10, color: 'rgba(255,255,255,.6)', fontSize: 9 }}>{synthesizedPhoto ? 'AFTER' : 'AI SYNTHESIS'}</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="label" style={{ color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>STEP 04 · TRY ON</div>
              <div className="ko" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '-.01em', marginBottom: 6 }}>
                {synthesizedPhoto ? '합성 결과가 도착했어요' : '이 헤어, 내 얼굴엔 어떨까?'}
              </div>
              <div className="ko" style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', fontWeight: 300, lineHeight: 1.6 }}>
                {synthesizedPhoto
                  ? '저장하거나 공유해보세요. 다시 보려면 같은 버튼을 눌러도 광고만 보면 됩니다.'
                  : '15초 광고를 보고 내 얼굴에 합성된 결과를 받아보세요.'}
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
              {Icons.play(13)} {synthesizedPhoto ? 'WATCH AD & SHOW AGAIN' : 'WATCH AD & SYNTHESIZE'}
            </button>
          </div>
        </Section>
      </div>

      {/* Sticky 하단 액션 바 — 긴 스크롤 페이지에서 메인 CTA 가 항상 손에 닿도록.
          모바일 앱 표준 패턴(IG/Pinterest 류). 100dvh 변동에도 고정. */}
      <div
        style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #000',
          padding: '10px 14px max(env(safe-area-inset-bottom), 14px)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}
      >
        <button
          onClick={onShare}
          aria-label="결과 공유"
          style={{ flex: 1, background: '#fff', color: '#000', border: '1px solid #000', padding: '12px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.18em', cursor: 'pointer', minHeight: 48 }}
        >
          SHARE
        </button>
        <button
          onClick={onSynthesize}
          aria-label="합성 결과 보기"
          style={{ flex: 2, background: '#000', color: '#fff', border: 'none', padding: '12px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {Icons.play(13, '#fff')} TRY ON
        </button>
      </div>
    </div>
  );
}

function rankSuffix(n) {
  return n === 1 ? '1ST' : n === 2 ? '2ND' : n === 3 ? '3RD' : `${n}TH`;
}
