// TODO: 트렌드 피드 데이터를 백엔드 API 또는 정적 큐레이션 JSON 으로 연결 (v1.x).
// 현재는 모두 정적 mock — 인터랙션 없음.
import { useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { TabBar, IndexMark } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

const FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'shape', label: 'SHAPE' },
  { id: 'mood', label: 'MOOD' },
  { id: 'season', label: 'SEASON' },
];

const TAGS = ['#계란형', '#쿠션단발', '#ROMANTIC', '#봄웜톤', '#세미글로우', '#ELEGANT', '#시스루뱅', '#롬앤'];

const GRID = [
  { tag: 'MOOD', title: 'ROMANTIC 무드 베스트 컷', meta: '1.2k saves' },
  { tag: 'SEASON', title: '봄 웜톤 메이크업 5선', meta: '998 saves' },
  { tag: 'SHAPE', title: '하트형, 단발이 답이다', meta: '847 saves' },
  { tag: 'MOOD', title: 'ELEGANT 분위기 일주일', meta: '723 saves' },
];

export default function Trend({ onNav }) {
  const [filter, setFilter] = useState('all');
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 22px 14px', flexShrink: 0 }}>
        <span className="label">TREND</span>
        <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} aria-label="search">{Icons.search(18)}</button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ padding: '24px 22px 18px', borderBottom: '1px solid #000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h1 className="ko" style={{ margin: 0, fontSize: 26, fontWeight: 300, lineHeight: 1.25, letterSpacing: '-.01em' }}>
            이번 주<br />가장 많이 본 룩
          </h1>
          <IndexMark n="vol. 17" />
        </div>
        <div className="serif-i" style={{ fontSize: 13, color: '#7a7a7a', marginTop: 14 }}>weekly · 04 / 28 — 05 / 04</div>
      </div>

      <div style={{ padding: '14px 22px', display: 'flex', gap: 6, overflowX: 'auto', borderBottom: '1px solid #e8e8e8' }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '7px 12px',
              background: filter === f.id ? '#000' : '#fff',
              color: filter === f.id ? '#fff' : '#000',
              border: '1px solid #000',
              fontFamily: 'Jost', fontSize: 10.5, letterSpacing: '.16em', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ margin: '18px 22px 0', position: 'relative', background: '#000', color: '#fff' }}>
          <div style={{ aspectRatio: '4/5', position: 'relative' }}>
            <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 50%,rgba(0,0,0,.85))' }} />
            <div className="label" style={{ position: 'absolute', top: 14, left: 16, color: 'rgba(255,255,255,.6)' }}>FEATURE · nº 01</div>
            <div className="serif-i" style={{ position: 'absolute', top: 14, right: 16, color: 'rgba(255,255,255,.6)', fontSize: 13 }}>this week</div>
            <div style={{ position: 'absolute', bottom: 18, left: 16, right: 16 }}>
              <div className="ko" style={{ fontSize: 24, fontWeight: 300, letterSpacing: '-.01em', lineHeight: 1.2, marginBottom: 8 }}>
                계란형이 사랑한<br />쿠션 단발의 모든 것
              </div>
              <div className="ko" style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', fontWeight: 300 }}>2,847 saves · 412 shares</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 22px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {GRID.map((c, i) => (
            <div key={i} style={{ cursor: 'pointer' }}>
              <div style={{ aspectRatio: '4/5', background: '#f6f1ed', position: 'relative', marginBottom: 10 }}>
                <FacePlaceholder w="100%" h="100%" tone={i % 2 === 0 ? 'light' : 'dark'} label="" />
                <span className="label" style={{ position: 'absolute', top: 8, left: 10, padding: '2px 6px', background: '#fff', color: '#000', fontSize: 9 }}>{c.tag}</span>
                <span className="serif-i" style={{ position: 'absolute', top: 8, right: 10, fontSize: 11, color: '#fff' }}>0{i + 2}</span>
              </div>
              <div className="ko" style={{ fontSize: 13, fontWeight: 500, letterSpacing: '-.005em', lineHeight: 1.4, marginBottom: 4 }}>{c.title}</div>
              <div className="serif-i" style={{ fontSize: 11, color: '#7a7a7a' }}>{c.meta}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '18px 22px 30px', borderTop: '1px solid #000', marginTop: 8 }}>
          <div className="label" style={{ marginBottom: 14 }}>TRENDING TAGS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {TAGS.map((t, i) => (
              <span
                key={i}
                className="ko"
                style={{
                  padding: '7px 12px', border: '1px solid #000',
                  background: i === 0 ? '#000' : '#fff', color: i === 0 ? '#fff' : '#000',
                  fontSize: 12, fontWeight: 300, cursor: 'pointer',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <TabBar active="trend" onNav={onNav} />
    </div>
  );
}
