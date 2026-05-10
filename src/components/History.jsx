// TODO: GET /api/history (Phase 3 인증 + 90일 보존 정책) 연결.
// 현재는 로컬 mock 4건. EDIT 모드 / 삭제 / EXPIRED 표시는 UI 만 동작.
import { useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader, TabBar } from './common/Layout';
import { Icons } from './common/Icons';
import { FacePlaceholder } from './common/Placeholders';

const ALL = [
  { date: '2026 · 04 · 28', label: '봄날의 햇살형', sub: '계란형 · 봄 웜톤', tone: 'dark' },
  { date: '2026 · 04 · 12', label: '고운 새벽형', sub: '하트형 · 겨울 쿨톤', tone: 'light' },
  { date: '2026 · 03 · 30', label: '단아한 가을형', sub: '긴형 · 가을 웜톤', tone: 'dark' },
  { date: '2025 · 10 · 11', label: '또렷한 겨울형', sub: '각진형 · 겨울 쿨톤', tone: 'light', expired: true },
];

export default function History({ onNav, onBack }) {
  const [removed, setRemoved] = useState({});
  const [editing, setEditing] = useState(false);
  const items = ALL.map((it, i) => ({ ...it, _idx: i })).filter((it) => !removed[it._idx]);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader label="ARCHIVE" title="HISTORY" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '22px 22px 16px', borderBottom: '1px solid #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="serif-i" style={{ fontSize: 14, color: '#7a7a7a', marginBottom: 4 }}>your archive</div>
              <h1 className="ko" style={{ margin: 0, fontSize: 26, fontWeight: 300, letterSpacing: '-.01em' }}>분석 히스토리</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="serif-i" style={{ fontSize: 24, fontWeight: 300 }}>{items.length}</div>
              <div className="label" style={{ fontSize: 9.5, color: '#7a7a7a' }}>RECORDS</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e8e8e8' }}>
          <span className="label" style={{ color: '#7a7a7a' }}>RECENT FIRST</span>
          <button
            onClick={() => setEditing((e) => !e)}
            style={{
              padding: '5px 12px', fontFamily: 'Jost', fontSize: 10, letterSpacing: '.2em',
              background: editing ? '#000' : '#fff', color: editing ? '#fff' : '#000',
              border: '1px solid #000', cursor: 'pointer',
            }}
          >
            {editing ? 'DONE' : 'EDIT'}
          </button>
        </div>

        {items.map((it, i) => (
          <div
            key={it._idx}
            role={editing ? undefined : 'button'}
            tabIndex={editing ? undefined : 0}
            className={editing ? undefined : 'tappable'}
            style={{
              display: 'flex', gap: 14, padding: '16px 22px',
              borderBottom: '1px solid #e8e8e8',
              alignItems: 'center',
              opacity: it.expired ? 0.55 : 1,
            }}
          >
            <span className="serif-i" style={{ fontSize: 14, color: '#a8a8a8', width: 22, flexShrink: 0 }}>0{i + 1}</span>
            <div style={{ width: 64, height: 80, flexShrink: 0, position: 'relative' }}>
              <FacePlaceholder w="100%" h="100%" tone={it.tone} label="" />
              {it.expired && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.55)', backdropFilter: 'grayscale(1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="label" style={{ fontSize: 8.5, padding: '2px 5px', background: '#000', color: '#fff', letterSpacing: '.18em' }}>EXPIRED</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div className="serif-i" style={{ fontSize: 11.5, color: '#7a7a7a' }}>{it.date}</div>
                {it.expired && <span className="label" style={{ fontSize: 8.5, color: '#7a7a7a' }}>· 6개월 경과</span>}
              </div>
              <div
                className="ko"
                style={{
                  fontSize: 15, fontWeight: 400, letterSpacing: '-.005em', marginBottom: 3,
                  textDecoration: it.expired ? 'line-through' : 'none', textDecorationColor: '#a8a8a8',
                }}
              >
                {it.label}
              </div>
              <div className="ko" style={{ fontSize: 11.5, color: '#5a5a5a', fontWeight: 300 }}>
                {it.expired ? '결과 보존 기간이 지나 다시 분석이 필요해요' : it.sub}
              </div>
            </div>
            {editing ? (
              <button
                onClick={() => setRemoved((r) => ({ ...r, [it._idx]: true }))}
                aria-label="delete"
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: '1px solid #000', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.6">
                  <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              Icons.arrow(16)
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: '40px 22px', textAlign: 'center' }}>
            <div className="serif-i" style={{ fontSize: 13, color: '#7a7a7a', marginBottom: 8 }}>archive cleared</div>
            <div className="ko" style={{ fontSize: 13, color: '#5a5a5a', fontWeight: 300 }}>모두 삭제했어요</div>
          </div>
        )}

        <div style={{ padding: '30px 22px 36px', background: '#f6f1ed', margin: '18px 22px 30px', textAlign: 'center', borderLeft: '2px solid #000' }}>
          <div className="serif-i" style={{ fontSize: 13, color: '#5a5a5a', marginBottom: 6 }}>your beauty changes every day</div>
          <div className="ko" style={{ fontSize: 15, fontWeight: 400, marginBottom: 14 }}>오늘의 나도 기록해볼까요?</div>
          <button
            style={{ background: '#000', color: '#fff', border: 'none', padding: '12px 22px', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}
          >
            NEW ANALYSIS →
          </button>
        </div>
      </div>

      <TabBar active="history" onNav={onNav} />
    </div>
  );
}
