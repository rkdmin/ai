import { StatusBar } from './common/StatusBar';
import { BackHeader, IndexMark } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder, MosaicOverlay } from './common/Placeholders';

// 카드 목록은 백엔드 응답이 오기 전 임시 mock.
// TODO: POST /api/cards/{hair|makeup} 응답을 cards prop 으로 주입.
const HAIR_MOCK = [
  { rank: 1, name: '쿠션 단발', sub: 'C컬 · 시스루 뱅 · ROMANTIC', locked: false, badge: 'BEST' },
  { rank: 2, locked: true },
  { rank: 3, locked: true },
  { rank: 0, name: '두꺼운 일자 풀뱅', sub: '얼굴이 더 길어 보일 수 있어요', warn: true, locked: false },
];
const MAKEUP_MOCK = [
  { rank: 1, name: '우아한 분위기 룩', sub: '세미 글로우 · ELEGANT MOOD', locked: false, badge: 'BEST' },
  { rank: 2, locked: true },
  { rank: 3, locked: true },
  { rank: 0, name: '과한 컨투어 룩', sub: '입체감이 인위적으로 보일 수 있어요', warn: true, locked: false },
];

export default function CardList({ type = 'hair', cards, onCard, onBack }) {
  const isHair = type === 'hair';
  const items = cards && cards.length ? cards : (isHair ? HAIR_MOCK : MAKEUP_MOCK);
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader label={isHair ? 'HAIR' : 'MAKEUP'} title={isHair ? '헤어 추천' : '메이크업 추천'} onBack={onBack} />

      <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="label" style={{ color: '#7a7a7a' }}>FOR YOU</div>
          <IndexMark n="nº 02" />
        </div>
        <h1 className="ko" style={{ margin: 0, fontSize: 22, fontWeight: 300, lineHeight: 1.3, letterSpacing: '-.01em' }}>
          {isHair ? <>가장 잘 어울리는<br />스타일과, 피해야 할 스타일</> : <>가장 잘 어울리는<br />룩과, 피해야 할 룩</>}
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px 30px' }}>
        {items.map((c, i) => (
          <CardRow key={i} card={c} onClick={() => onCard?.(c)} />
        ))}
      </div>
    </div>
  );
}

function CardRow({ card, onClick }) {
  const isWarn = card.warn;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid #e8e8e8',
        cursor: 'pointer', alignItems: 'stretch', position: 'relative',
      }}
    >
      <div style={{ width: 96, height: 124, position: 'relative', flexShrink: 0 }}>
        <FacePlaceholder w="100%" h="100%" tone={isWarn ? 'light' : 'dark'} label="" />
        {card.locked && <MosaicOverlay warn={isWarn} />}
        <div
          style={{
            position: 'absolute', top: -1, left: -1, padding: '5px 9px',
            background: '#000', color: '#fff', display: 'flex', alignItems: 'baseline', gap: 4, zIndex: 2,
          }}
        >
          {isWarn ? (
            <span className="label" style={{ fontSize: 9.5, letterSpacing: '.2em' }}>AVOID</span>
          ) : (
            <>
              <span className="serif-i" style={{ fontSize: 18, fontWeight: 300, lineHeight: 1, letterSpacing: '-.01em' }}>{card.rank}</span>
              <span className="label" style={{ fontSize: 8.5, letterSpacing: '.2em' }}>
                {card.rank === 1 ? 'ST' : card.rank === 2 ? 'ND' : 'RD'}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          {card.badge && (
            <span className="label" style={{ padding: '2px 6px', border: '1px solid #000', background: '#000', color: '#fff', fontSize: 9 }}>
              {card.badge}
            </span>
          )}
          {!isWarn && !card.locked && <span className="label" style={{ color: '#7a7a7a', fontSize: 9 }}>FREE</span>}
          {!isWarn && card.locked && <span className="label" style={{ color: '#7a7a7a', fontSize: 9 }}>LOCKED</span>}
          {isWarn && <span className="label" style={{ color: '#7a7a7a', fontSize: 9 }}>NOT RECOMMENDED</span>}
        </div>
        {card.locked && !isWarn ? (
          <>
            <div className="ko" style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-.01em', marginBottom: 6, lineHeight: 1.3, color: '#a8a8a8' }}>
              ■■■ ■■
            </div>
            <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', fontWeight: 300, lineHeight: 1.5 }}>
              광고를 보면 {card.rank}위 추천을 볼 수 있어요
            </div>
          </>
        ) : (
          <>
            <div className="ko" style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-.01em', marginBottom: 6, lineHeight: 1.3 }}>
              {card.name}
            </div>
            <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.5 }}>{card.sub}</div>
          </>
        )}
        {card.locked && !isWarn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 8px', border: '1px solid #000', alignSelf: 'flex-start' }}>
            {Icons.play(11)}
            <span className="label" style={{ fontSize: 9 }}>광고 보고 확인</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>{Icons.arrow(16, isWarn ? '#a8a8a8' : '#000')}</div>
    </div>
  );
}
