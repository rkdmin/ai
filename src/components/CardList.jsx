import { StatusBar } from './common/StatusBar';
import { BackHeader, IndexMark } from './common/Layout';
import { Icons } from './common/Icons';
import { StateNotice } from './common/StateNotice';
import { FacePlaceholder, MosaicOverlay } from './common/Placeholders';

/**
 * 추천 카드 4장 (rank 1·2·3 + AVOID).
 * 카드는 백엔드(POST /api/cards/{hair|makeup}) 응답을 mappers.mapHairCard / mapMakeupCard 로
 * 정규화한 형태를 받는다 — 호출 측 책임.
 *
 * 빈 배열이거나 cards=null 이면 데모 더미를 띄우는 게 아니라 빈 슬롯을 보여준다 (회귀 명확하게).
 */
export default function CardList({ type = 'hair', cards, onCard, onBack }) {
  const isHair = type === 'hair';
  const items = Array.isArray(cards) ? cards : [];
  const empty = items.length === 0;

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 22px max(env(safe-area-inset-bottom), 30px)' }}>
        {empty ? (
          <EmptyState type={type} />
        ) : (
          items.map((c, i) => <CardRow key={i} card={c} onClick={() => onCard?.(c)} />)
        )}
      </div>
    </div>
  );
}

function EmptyState({ type }) {
  return (
    <StateNotice
      variant="empty"
      icon
      eyebrow="NO CARDS YET"
      message={
        <>
          {type === 'makeup' ? '메이크업 카드를 불러오지 못했어요.' : '헤어 카드를 불러오지 못했어요.'}<br />
          뒤로 가서 다시 시도해 주세요.
        </>
      }
    />
  );
}

function CardRow({ card, onClick }) {
  const isWarn = !!card.warn;
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="tappable"
      style={{
        display: 'flex', gap: 16, padding: '18px 0', borderBottom: '1px solid #e8e8e8',
        alignItems: 'stretch', position: 'relative',
        minHeight: 124,
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
                {ordinal(card.rank)}
              </span>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
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
            <div className="ko" style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-.01em', marginBottom: 6, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {card.name || '추천 카드'}
            </div>
            <div className="ko" style={{ fontSize: 12, color: '#5a5a5a', fontWeight: 300, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {card.sub}
            </div>
          </>
        )}
        {card.locked && !isWarn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 8px', border: '1px solid #000', alignSelf: 'flex-start' }}>
            {Icons.play(11)}
            <span className="label" style={{ fontSize: 9 }}>광고 보고 확인</span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{Icons.arrow(16, isWarn ? '#a8a8a8' : '#000')}</div>
    </div>
  );
}

function ordinal(n) {
  if (n === 1) return 'ST';
  if (n === 2) return 'ND';
  if (n === 3) return 'RD';
  return 'TH';
}
