// TODO: RECENT 카드 데이터를 분석 히스토리(GET /api/history)로 연결.
// 현재는 모든 타일이 동일하게 다음 단계(upload)로 이동.
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { TabBar, IndexMark } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

export default function Home({ onNext, onNav }) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px 14px', flexShrink: 0 }}>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="menu">{Icons.menu(20)}</button>
        <span className="wm" style={{ fontSize: 21, letterSpacing: '-.005em' }}>beaumi</span>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="notifications">{Icons.bell(18)}</button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', background: '#000', color: '#fff', padding: '40px 26px 36px' }}>
          <div className="label" style={{ color: '#a8a8a8', marginBottom: 14 }}>NEW · AI BEAUTY COACH</div>
          <h1 className="ko" style={{ margin: 0, fontSize: 28, fontWeight: 300, lineHeight: 1.28, letterSpacing: '-.01em' }}>
            오늘의 나를<br />가장 정확하게
          </h1>
          <p className="ko" style={{ margin: '14px 0 22px', fontSize: 13, lineHeight: 1.7, color: '#bdbdbd', maxWidth: 280, fontWeight: 300 }}>
            정면 사진 한 장으로 얼굴형을 분석하고<br />전문가 큐레이션 카드 4장을 받아보세요.
          </p>
          <button
            onClick={onNext}
            style={{ background: '#fff', color: '#000', border: 'none', padding: '13px 22px', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', fontWeight: 500, cursor: 'pointer' }}
          >
            START ANALYSIS
          </button>
          <div className="serif-i" style={{ position: 'absolute', top: 18, right: 24, color: '#6a6a6a', fontSize: 14 }}>nº 01</div>
        </div>

        <div style={{ padding: '26px 22px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="label">EXPLORE</div>
          <IndexMark n="nº 02" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #000', borderBottom: '1px solid #000', margin: '0 22px' }}>
          <Tile icon={Icons.camera(26)} label="ANALYZE" sub="얼굴형 분석" br rb onClick={onNext} />
          <Tile icon={Icons.sparkle(26)} label="STYLES" sub="추천 카드 4장" rb onClick={onNext} />
          <Tile icon={Icons.archive(26)} label="HISTORY" sub="최근 분석" br onClick={() => onNav?.('history')} />
          <Tile icon={Icons.user(26)} label="MY" sub="퍼스널컬러" onClick={() => onNav?.('my')} />
        </div>

        <div style={{ padding: '24px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="label">RECENT</div>
            <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', marginTop: 4, fontWeight: 300 }}>최근 분석 결과</div>
          </div>
          <span onClick={() => onNav?.('history')} className="ko" style={{ fontSize: 11, color: '#7a7a7a', cursor: 'pointer' }}>전체보기 →</span>
        </div>
        <div style={{ padding: '0 22px 24px', display: 'flex', gap: 12, overflowX: 'auto' }}>
          <RecentCard date="04 / 28" label="계란형 · 봄웜" tone="cream" />
          <RecentCard date="04 / 12" label="하트형 · 겨울쿨" tone="paper" />
          <RecentCard date="03 / 30" label="긴형 · 가을웜" tone="cream" />
        </div>
      </div>

      <TabBar active="home" onNav={onNav} />
    </div>
  );
}

function Tile({ icon, label, sub, br, rb, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '24px 14px 22px',
        borderRight: br ? '1px solid #000' : 'none',
        borderBottom: rb ? '1px solid #000' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, minHeight: 120, cursor: 'pointer',
      }}
    >
      <div>{icon}</div>
      <div>
        <div className="label" style={{ marginBottom: 4 }}>{label}</div>
        <div className="ko" style={{ fontSize: 11.5, color: '#7a7a7a', fontWeight: 400 }}>{sub}</div>
      </div>
    </div>
  );
}

function RecentCard({ date, label, tone }) {
  const bg = tone === 'cream' ? '#f3ece5' : '#f6f4f0';
  return (
    <div style={{ flex: '0 0 150px', background: bg, padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}>
      <div style={{ aspectRatio: '4/5', width: '100%' }}>
        <FacePlaceholder w="100%" h="100%" tone="light" label="result" />
      </div>
      <div className="serif-i" style={{ fontSize: 13 }}>{date}</div>
      <div className="ko" style={{ fontSize: 11.5, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
