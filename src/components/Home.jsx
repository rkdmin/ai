import { useEffect, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { TabBar } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';
import { fetchHistory } from '../api/ai';
import connectorAsset from '../assets/figma/home-connector.svg';
import dividerAsset from '../assets/figma/divider.svg';

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

const ANALYSIS_STEPS = [
  { n: '01', title: 'FACE STRUCTURE', lines: ['얼굴형', '얼굴선', '얼굴 비율'] },
  { n: '02', title: 'BEAUTY MOOD', lines: ['안정적으로 확인된 얼굴 구조를 기반으로', '전체적인 인상 패턴 해석'] },
  { n: '03', title: 'STYLE DIRECTION', lines: ['Beauty Mood와 얼굴 구조를 기반으로', 'Hair · Makeup 추천'] },
];

export default function Home({ profile = null, onNext, onNav, onOpenRecent, canAccessHistory = false }) {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let alive = true;
    if (!canAccessHistory) {
      setRecent([]);
      return () => { alive = false; };
    }
    fetchHistory(3)
      .then((rows) => {
        if (alive) setRecent(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (alive) setRecent([]);
      });
    return () => { alive = false; };
  }, [canAccessHistory]);

  return (
    <div className="wf-screen">
      <StatusBar />
      <header className="wf-header">
        <span className="wm" style={{ fontSize: 18 }}>beaumi</span>
        <button className="icon-btn" style={{ marginRight: -8, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, minWidth: 36, minHeight: 36 }} aria-label="히스토리" onClick={() => onNav?.('history')}>
          {Icons.archive(16, '#6b7280')}
        </button>
      </header>

      <main className="wf-scroll" style={{ padding: '28px 16px 40px' }}>
        <section style={{ paddingBottom: 32 }}>
          <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-.035em' }}>
            사진 한 장으로<br />나에게 어울리는 분위기와<br />스타일을 찾아보세요
          </h1>
          <p className="ko" style={{ margin: '12px 0 0', color: '#4b5563', fontSize: 14, lineHeight: 1.5 }}>
            얼굴 구조를 분석해<br />나만의 Beauty Mood와<br />헤어 · 메이크업 스타일 방향을 알려드려요.
          </p>
        </section>

        <section className="wf-card" style={{ padding: 20, marginBottom: 24 }} aria-labelledby="analysis-logic-title">
          <h2 id="analysis-logic-title" className="ko" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>AI가 이렇게 분석해요</h2>
          {ANALYSIS_STEPS.map((step, index) => (
            <div key={step.n}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 28, height: 28, borderRadius: 14, border: '1px solid #e5e7eb', background: '#f3f4f6', display: 'grid', placeItems: 'center', color: '#4b5563', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {step.n}
                </span>
                <div style={{ paddingTop: 4, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{step.title}</div>
                  {step.lines.map((line) => (
                    <div key={line} className="ko" style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.45 }}>
                      {index === 0 ? `• ${line}` : line}
                    </div>
                  ))}
                </div>
              </div>
              {index < ANALYSIS_STEPS.length - 1 && (
                <img src={connectorAsset} alt="" width="28" height="24" style={{ display: 'block' }} />
              )}
            </div>
          ))}
          <div style={{ width: '100%', overflow: 'hidden', margin: '20px 0 12px' }} aria-hidden="true">
            <img src={dividerAsset} alt="" width="318" height="1" style={{ display: 'block' }} />
          </div>
          <p className="ko" style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.5, margin: 0 }}>확실하게 확인되는 특징을 중심으로 분석해요.</p>
        </section>

        <section className="wf-card" style={{ padding: 16, marginBottom: 24 }} aria-labelledby="preview-title">
          <h2 id="preview-title" className="ko" style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>분석 결과 미리보기</h2>
          <div style={{ height: 160, border: '1px solid #e5e7eb', borderRadius: 4, overflow: 'hidden', background: '#f3f4f6' }}>
            <FacePlaceholder w="100%" h="100%" tone="light" label="" />
          </div>
          <div style={{ paddingTop: 16 }}>
            <div className="wf-eyebrow" style={{ marginBottom: 3 }}>MY BEAUTY MOOD</div>
            <div className="ko" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
              {profile?.legacy ? (profile.faceType || '이전 분석 결과') : (profile?.moodTitle || '나의 Beauty Mood')}
            </div>
            <p className="ko" style={{ margin: '12px 0', color: '#4b5563', fontSize: 13, lineHeight: 1.5 }}>
              {profile?.legacy ? '이전 버전에서 저장된 분석이에요.' : (profile?.moodSummary || '얼굴선과 비율에서 안정적인 특징을 찾아 결과를 정리해드려요.')}
            </p>
            <button type="button" className="wf-btn-ghost" onClick={onNext} style={{ minHeight: 36, padding: 0, justifyContent: 'flex-start', borderTop: '1px solid #e5e7eb', borderRadius: 0, fontSize: 14 }}>
              내 결과 만들기 →
            </button>
          </div>
        </section>

        <button type="button" className="wf-btn-primary" onClick={onNext}>내 Beauty Mood 분석하기</button>

        <section style={{ paddingTop: 32 }} aria-labelledby="recent-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h2 id="recent-title" className="wf-eyebrow" style={{ margin: 0 }}>RECENT HISTORY</h2>
              <p className="ko" style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0' }}>최근 분석 결과</p>
            </div>
            <button type="button" className="wf-btn-ghost" onClick={() => onNav?.('history')} style={{ width: 'auto', minHeight: 40, padding: '0 4px', fontSize: 13 }}>전체보기 →</button>
          </div>

          {recent.length > 0 ? (
            <div className="snap-x" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 }}>
              {recent.map((item) => (
                <button key={item.analysisId} type="button" onClick={() => onOpenRecent?.(item.analysisId)} style={{ flex: '0 0 154px', padding: 0, textAlign: 'left', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', opacity: item.photoExpired ? .65 : 1 }}>
                  <div style={{ height: 118, background: '#f3f4f6' }}><FacePlaceholder w="100%" h="100%" tone="light" label="" /></div>
                  <div style={{ padding: 12 }}>
                    <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 5 }}>{formatRecentDate(item.createdAt)}</div>
                    <div className="ko" style={{ color: '#111827', fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{formatRecentLabel(item)}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="wf-card" style={{ padding: 16, background: '#f9fafb' }}>
              <p className="ko" style={{ fontSize: 13, lineHeight: 1.55, color: '#6b7280', margin: 0 }}>
                {canAccessHistory
                  ? '아직 저장된 분석 기록이 없어요. 새 분석을 시작하면 여기에서 다시 열어볼 수 있어요.'
                  : '로그인하면 최근 분석과 카드 기록을 여기에서 바로 다시 열어볼 수 있어요.'}
              </p>
            </div>
          )}
        </section>
      </main>

      <TabBar active="home" onNav={onNav} />
    </div>
  );
}
