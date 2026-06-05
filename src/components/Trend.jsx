// 트렌드 피드는 v1.x 범위. 실데이터(백엔드 API 또는 정적 큐레이션 JSON)가 붙기 전까지는
// mock 피드를 노출하지 않고 정직한 "준비 중" 상태만 보여준다. (Phase 4-6 결정: 경량화)
import { StatusBar } from './common/StatusBar';
import { TabBar, IndexMark } from './common/Layout';

export default function Trend({ onNav }) {
  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <span className="label" style={{ paddingLeft: 8 }}>TREND</span>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '24px 22px 18px', borderBottom: '1px solid #000',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}
        >
          <h1 className="ko" style={{ margin: 0, fontSize: 26, fontWeight: 300, lineHeight: 1.25, letterSpacing: '-.01em' }}>
            트렌드 피드는<br />준비 중이에요
          </h1>
          <IndexMark n="soon" />
        </div>

        {/* 준비 중 — 실데이터 전까지 빈 상태를 정직하게 노출 */}
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            padding: '48px 28px', gap: 18,
          }}
        >
          <span className="serif-i" style={{ fontSize: 40, fontWeight: 300, color: '#d4d4d4', lineHeight: 1 }}>
            coming soon
          </span>
          <div className="ko" style={{ fontSize: 13.5, fontWeight: 300, lineHeight: 1.7, color: '#5a5a5a', maxWidth: 320 }}>
            얼굴형·무드·시즌별 인기 룩을 모아 보여드릴 주간 트렌드 피드를 준비하고 있어요.
            준비되면 이 탭에서 가장 먼저 만나보실 수 있어요.
          </div>
          <button
            onClick={() => onNav?.('home')}
            className="tappable"
            style={{
              marginTop: 8, background: '#000', color: '#fff', border: 'none',
              padding: '14px 28px', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em',
              cursor: 'pointer', minHeight: 48,
            }}
          >
            START ANALYSIS
          </button>
        </div>
      </div>

      <TabBar active="trend" onNav={onNav} />
    </div>
  );
}
