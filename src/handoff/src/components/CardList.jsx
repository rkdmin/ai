import { Icons } from './common/Icons';
import { BackHeader } from './common/Layout';
import { FacePlaceholder, MosaicOverlay } from './common/Placeholders';

// Card list — shows 4 cards: rank 1 (free), 2 & 3 (ad-locked), AVOID (free)
// type: 'hair' | 'makeup'
export default function CardList({ type = 'hair', cards, onCard, onBack }) {
  const fallback = {
    hair: [
      { rank: 1, name: '쿠션 단발', sub: 'C컬 · 시스루 뱅 · ROMANTIC', tone: 'warm' },
      { rank: 2, name: '광고 잠금', sub: '광고를 보면 2위 추천을 볼 수 있어요', locked: true, tone: 'light' },
      { rank: 3, name: '광고 잠금', sub: '광고를 보면 3위 추천을 볼 수 있어요', locked: true, tone: 'cool' },
      { warn: true, name: '비추천 스타일', sub: '긴 일자 단발 · 인상이 무거워질 수 있어요', tone: 'dark' },
    ],
    makeup: [
      { rank: 1, name: '엘레강트 리턴', sub: 'BLUSH 코랄 · LIPS MLBB · ELEGANT MOOD', tone: 'warm' },
      { rank: 2, name: '광고 잠금', sub: '광고를 보면 2위 추천을 볼 수 있어요', locked: true, tone: 'light' },
      { rank: 3, name: '광고 잠금', sub: '광고를 보면 3위 추천을 볼 수 있어요', locked: true, tone: 'cool' },
      { warn: true, name: '비추천 스타일', sub: '강한 스모키 · 인상이 차갑게 보일 수 있어요', tone: 'dark' },
    ],
  };
  const list = cards && cards.length === 4 ? cards : fallback[type];
  const sectionLabel = type === 'hair' ? 'HAIR' : 'MAKEUP';

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000' }}>
      <BackHeader label={`STEP 03 · ${sectionLabel} CARDS`} title={type === 'hair' ? '헤어 추천' : '메이크업 추천'} onBack={onBack} />

      <div style={{ padding: '22px 22px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map((c, i) => (
            <CardRow key={i} card={c} index={i} onClick={() => onCard?.(c, i)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardRow({ card, index, onClick }) {
  const isWarn = !!card.warn;
  const labelText = isWarn
    ? 'AVOID · NOT RECOMMENDED'
    : `${card.rank}${ord(card.rank)} ${card.rank === 1 ? '· BEST MATCH' : ''}`.trim();

  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: '1px solid #000', padding: 0, cursor: 'pointer',
        display: 'grid', gridTemplateColumns: '110px 1fr 28px', gap: 14,
        textAlign: 'left', alignItems: 'stretch',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '1/1.2' }}>
        <FacePlaceholder w="100%" h="100%" tone={card.tone || 'light'} label="" />
        {card.locked && <MosaicOverlay warn={false} />}
      </div>

      <div style={{ padding: '14px 0 14px 0', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, minWidth: 0 }}>
        <div className="label" style={{ fontSize: 9, color: isWarn ? '#c45a3b' : '#7a7a7a' }}>{labelText}</div>
        {card.locked ? (
          <>
            <div className="ko" style={{ fontSize: 16, fontWeight: 400, letterSpacing: '0.3em' }}>■■■ ■■</div>
            <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300, lineHeight: 1.5 }}>{card.sub}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '5px 8px', border: '1px solid #000', alignSelf: 'flex-start' }}>
              {Icons.play(11)}<span className="label" style={{ fontSize: 9 }}>광고 보고 확인</span>
            </div>
          </>
        ) : (
          <>
            <div className="ko" style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-.01em', marginBottom: 2, lineHeight: 1.3 }}>{card.name}</div>
            <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.5 }}>{card.sub}</div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingRight: 12 }}>
        {Icons.arrow(16, isWarn ? '#a8a8a8' : '#000')}
      </div>
    </button>
  );
}

function ord(n) {
  if (n === 1) return 'ST';
  if (n === 2) return 'ND';
  if (n === 3) return 'RD';
  return 'TH';
}
