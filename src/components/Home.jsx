import { useEffect, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { TabBar, IndexMark } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';
import { fetchHistory } from '../api/ai';

function formatRecentLabel(item) {
  const face = item.faceType || '분석 결과';
  const tone = item.personalColor ? `· ${item.personalColor}` : '';
  return `${face} ${tone}`.trim();
}

function formatRecentDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getDate()).padStart(2, '0')}`;
}

export default function Home({ onNext, onNav, onOpenRecent, canAccessHistory = false }) {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!canAccessHistory) {
      setRecent([]);
      return () => { alive = false; };
    }
    fetchHistory(3)
      .then((rows) => {
        if (!alive) return;
        setRecent(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!alive) return;
        setRecent([]);
      });
    return () => { alive = false; };
  }, [canAccessHistory]);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <span style={{ width: 32 }} />
        <span className="wm" style={{ fontSize: 21, letterSpacing: '-.005em' }}>beaumi</span>
        <button className="icon-btn" style={{ marginRight: -6 }} aria-label="history" onClick={() => onNav?.('history')}>{Icons.archive(18)}</button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', background: '#000', color: '#fff', padding: '40px 26px 36px' }}>
          <div className="label" style={{ color: '#a8a8a8', marginBottom: 14 }}>NEW · AI BEAUTY COACH</div>
          <h1 className="ko" style={{ margin: 0, fontSize: 28, fontWeight: 300, lineHeight: 1.28, letterSpacing: '-.01em' }}>
            오늘의 얼굴을<br />가장 정확하게
          </h1>
          <p className="ko" style={{ margin: '14px 0 22px', fontSize: 13, lineHeight: 1.7, color: '#bdbdbd', maxWidth: 280, fontWeight: 300 }}>
            정면 사진 한 장으로 얼굴형을 분석하고<br />전문가 큐레이션 카드 4개를 받아보세요.
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
          <Tile icon={Icons.sparkle(26)} label="RESULTS" sub="추천 카드 다시 보기" rb onClick={() => onNav?.('history')} />
          <Tile icon={Icons.archive(26)} label="HISTORY" sub="최근 분석 기록" br onClick={() => onNav?.('history')} />
          <Tile icon={Icons.user(26)} label="MY" sub="계정과 활동 관리" onClick={() => onNav?.('my')} />
        </div>

        <div style={{ padding: '24px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="label">RECENT</div>
            <div className="ko" style={{ fontSize: 12, color: '#7a7a7a', marginTop: 4, fontWeight: 300 }}>최근 분석 결과</div>
          </div>
          <span onClick={() => onNav?.('history')} className="ko" style={{ fontSize: 11, color: '#7a7a7a', cursor: 'pointer' }}>전체보기 →</span>
        </div>

        {recent.length > 0 ? (
          <div className="snap-x" style={{ padding: '0 22px 24px', display: 'flex', gap: 12, overflowX: 'auto' }}>
            {recent.map((item, index) => (
              <RecentCard
                key={item.analysisId}
                date={formatRecentDate(item.createdAt)}
                label={formatRecentLabel(item)}
                tone={index % 2 === 0 ? 'cream' : 'paper'}
                expired={item.photoExpired}
                onClick={() => onOpenRecent?.(item.analysisId)}
              />
            ))}
          </div>
        ) : (
          <div style={{ margin: '0 22px 24px', padding: '18px 16px', background: '#f6f1ed', borderLeft: '2px solid #000' }}>
            <div className="label" style={{ marginBottom: 6 }}>RECENT HISTORY</div>
            <div className="ko" style={{ fontSize: 12.5, color: '#5a5a5a', lineHeight: 1.6, fontWeight: 300 }}>
              {canAccessHistory
                ? '아직 저장된 분석 기록이 없어요. 새 분석을 시작하면 여기에서 다시 열어볼 수 있어요.'
                : '로그인하면 최근 분석과 카드 기록을 여기에서 바로 다시 열어볼 수 있어요.'}
            </div>
          </div>
        )}
      </div>

      <TabBar active="home" onNav={onNav} />
    </div>
  );
}

function Tile({ icon, label, sub, br, rb, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="tappable"
      style={{
        padding: '24px 14px 22px',
        borderRight: br ? '1px solid #000' : 'none',
        borderBottom: rb ? '1px solid #000' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, minHeight: 120,
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

function RecentCard({ date, label, tone, expired = false, onClick }) {
  const bg = tone === 'cream' ? '#f3ece5' : '#f6f4f0';
  return (
    <div
      role="button"
      tabIndex={0}
      className="tappable"
      onClick={onClick}
      style={{ flex: '0 0 150px', background: bg, padding: '12px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', opacity: expired ? 0.7 : 1 }}
    >
      <div style={{ aspectRatio: '4/5', width: '100%' }}>
        <FacePlaceholder w="100%" h="100%" tone="light" label="result" />
      </div>
      {expired && (
        <div style={{ position: 'absolute', top: 18, left: 18, padding: '3px 6px', background: '#000', color: '#fff' }}>
          <span className="label" style={{ fontSize: 8.5 }}>EXPIRED</span>
        </div>
      )}
      <div className="serif-i" style={{ fontSize: 13 }}>{date}</div>
      <div className="ko" style={{ fontSize: 11.5, fontWeight: 500 }}>{label}</div>
    </div>
  );
}
