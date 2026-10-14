// 통합 Beauty Report — Figma paid-beauty-report-hair(108:3175) / -makeup(108:3277). plan 0009 F04.
// 한 리포트에 HAIR / MAKEUP 두 탭. 탭 전환은 재생성하지 않는다 (같은 reportId 의 저장본).
// 본문 모양은 .claude/rules/api-contract.md "통합 Beauty Report" — overview·styles[3]·avoid·salonGuide / overview·focusParts·looks[3]·avoid.
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { moodLabelText } from '../utils/moodLabel';

const TABS = [
  { id: 'hair', label: 'HAIR' },
  { id: 'makeup', label: 'MAKEUP' },
];

export default function Report({ report, tab = 'hair', onTab, onBack, onShare, onOpenStyle, onOpenLook, onRetry, onUnlock }) {
  const status = report?.status || 'not_started';
  const analysis = report?.analysis || {};
  const primaryLine = analysis.primaryMood
    ? ['Primary', analysis.primaryMood, ...(analysis.traits || [])].join(' · ')
    : null;

  return (
    <div className="wf-screen">
      <StatusBar />
      <header className="wf-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로가기" style={{ marginLeft: -12 }}>
          {Icons.back(20, '#111827')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-eyebrow">BEAUTY REPORT</div>
          <div className="ko" style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {analysis.moodTitle || '나의 Beauty Report'}
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onShare} aria-label="리포트 공유" style={{ marginRight: -10 }}>
          {Icons.share(16, '#111827')}
        </button>
      </header>

      <div role="tablist" aria-label="리포트 탭" style={{ display: 'flex', borderBottom: '1px solid var(--color-line)', flexShrink: 0 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTab?.(t.id)}
              className="wf-eyebrow"
              style={{
                flex: 1, minHeight: 44, background: 'transparent', border: 0, cursor: 'pointer',
                color: active ? 'var(--color-text)' : 'var(--color-text-subtle)',
                borderBottom: active ? '2px solid var(--color-text)' : '2px solid transparent', marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <main className="wf-scroll" style={{ padding: '24px 20px 120px' }}>
        <section className="wf-card" style={{ padding: 16, background: 'var(--color-surface)', border: 0 }}>
          <div className="wf-eyebrow">MY BEAUTY PROFILE</div>
          <div className="ko" style={{ marginTop: 6, fontSize: 16, fontWeight: 800 }}>{analysis.moodTitle || '나의 Beauty Mood'}</div>
          {primaryLine && <div className="ko" style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{primaryLine}</div>}
          {analysis.faceType && <div className="ko" style={{ marginTop: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>{analysis.faceType}</div>}
        </section>

        {report?.locked ? (
          <Notice
            title="Beauty Report 를 보려면 구매가 필요해요"
            body="구매하면 Hair 와 Makeup 두 탭이 함께 열려요. 이미 구매했다면 MY 에서 구매 복원을 눌러 주세요."
            action={onUnlock && <button type="button" className="wf-btn-primary" onClick={onUnlock} style={{ marginTop: 14 }}>Beauty Report 구매하기</button>}
          />
        ) : status === 'generating' || status === 'not_started' ? (
          <Notice title="리포트를 만들고 있어요" body="Hair 와 Makeup 가이드를 정리하는 중이에요. 잠시만 기다려 주세요." />
        ) : tab === 'hair' ? (
          <HairTab hair={report?.hair} error={report?.hairError} onOpenStyle={onOpenStyle} onRetry={onRetry} />
        ) : (
          <MakeupTab makeup={report?.makeup} error={report?.makeupError} onOpenLook={onOpenLook} onRetry={onRetry} />
        )}
      </main>
    </div>
  );
}

function Notice({ title, body, action }) {
  return (
    <section className="wf-card" style={{ padding: 20, marginTop: 20 }} role="status">
      <div className="ko" style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
      <p className="ko" style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>{body}</p>
      {action}
    </section>
  );
}

function FailedTab({ label, error, onRetry }) {
  return (
    <Notice
      title={`${label} 가이드를 만들지 못했어요`}
      body={error ? `사유: ${error}` : '잠시 후 다시 시도해 주세요. 다른 탭은 그대로 볼 수 있어요.'}
      action={onRetry && <button type="button" className="wf-btn-secondary" onClick={onRetry} style={{ marginTop: 14 }}>이 탭만 다시 만들기</button>}
    />
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div className="wf-eyebrow">{eyebrow}</div>
      {title && <h2 className="ko" style={{ margin: '6px 0 0', fontSize: 17, fontWeight: 700 }}>{title}</h2>}
    </div>
  );
}

function Row({ label, value, reason }) {
  if (!value) return null;
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span className="wf-eyebrow" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <span className="ko" style={{ fontSize: 14, fontWeight: 700, textAlign: 'right' }}>{value}</span>
      </div>
      {reason && <p className="ko" style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>{reason}</p>}
    </div>
  );
}

function StyleCard({ n, title, sub, moodLabel, onOpen, testId }) {
  return (
    <div className="wf-card" style={{ padding: 16, marginTop: 10 }} data-testid={testId}>
      <div className="wf-eyebrow">{`Nº 0${n}${moodLabel ? ` · ${moodLabelText(moodLabel)}` : ''}`}</div>
      <div className="ko" style={{ marginTop: 6, fontSize: 16, fontWeight: 700 }}>{title}</div>
      {sub && <p className="ko" style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>{sub}</p>}
      <button type="button" className="wf-btn-ghost" onClick={onOpen} style={{ marginTop: 8, minHeight: 36, padding: 0, justifyContent: 'flex-start', fontSize: 14 }}>
        자세히 보기 {Icons.arrow(16, '#111827')}
      </button>
    </div>
  );
}

function HairTab({ hair, error, onOpenStyle, onRetry }) {
  if (!hair) return <FailedTab label="Hair" error={error} onRetry={onRetry} />;
  const ov = hair.overview || {};
  const styles = (hair.styles || []).slice(0, 3);
  return (
    <div data-testid="report-hair">
      <SectionTitle eyebrow="HAIR DIRECTION" title="나에게 맞는 헤어 방향" />
      {ov.direction && <p className="ko" style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{ov.direction}</p>}
      <div style={{ marginTop: 8 }}>
        <Row label="LENGTH" value={ov.length?.value} reason={ov.length?.reason} />
        <Row label="BANGS" value={ov.bangs?.value} reason={ov.bangs?.reason} />
        <Row label="VOLUME" value={ov.volume?.value} reason={ov.volume?.reason} />
        <Row label="LAYER" value={ov.layer?.value} reason={ov.layer?.reason} />
      </div>

      <SectionTitle eyebrow="RECOMMENDED STYLES" title="추천 스타일 3" />
      {styles.map((s, i) => (
        <StyleCard key={s.rank || i} n={s.rank || i + 1} title={s.hair} sub={s.hairReason} moodLabel={s.moodLabel} onOpen={() => onOpenStyle?.(s)} testId={`hair-style-${s.rank || i + 1}`} />
      ))}

      {hair.avoid?.hair && (
        <>
          <SectionTitle eyebrow="AVOID" title="피하면 좋은 헤어" />
          <div className="wf-card" style={{ padding: 16, marginTop: 10, borderColor: 'var(--color-line-strong)' }}>
            <div className="ko" style={{ fontSize: 15, fontWeight: 700 }}>{hair.avoid.hair}</div>
            {hair.avoid.hairReason && <p className="ko" style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>{hair.avoid.hairReason}</p>}
          </div>
        </>
      )}

      {hair.salonGuide && (
        <>
          <SectionTitle eyebrow="SALON GUIDE" title="미용실에서 이렇게 말해 보세요" />
          <div className="wf-card" style={{ padding: 16, marginTop: 10, background: 'var(--color-surface)', border: 0 }}>
            <p className="ko" style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{hair.salonGuide}</p>
          </div>
        </>
      )}
    </div>
  );
}

function MakeupTab({ makeup, error, onOpenLook, onRetry }) {
  if (!makeup) return <FailedTab label="Makeup" error={error} onRetry={onRetry} />;
  const ov = makeup.overview || {};
  const focus = (makeup.focusParts || []).slice(0, 3);
  const looks = (makeup.looks || []).slice(0, 3);
  return (
    <div data-testid="report-makeup">
      <SectionTitle eyebrow="MAKEUP DIRECTION" title="나에게 맞는 메이크업 방향" />
      {ov.direction && <p className="ko" style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{ov.direction}</p>}
      {ov.faceBalance && <p className="ko" style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.6 }}>{ov.faceBalance}</p>}

      {focus.length > 0 && (
        <>
          <SectionTitle eyebrow="FOCUS PARTS" title="확실하게 살릴 부위" />
          {focus.map((f) => (
            <div key={f.part} className="wf-card" style={{ padding: 14, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span className="wf-eyebrow" style={{ color: 'var(--color-text)' }}>{f.part}</span>
                {f.evidence && <span className="ko" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>근거 · {f.evidence}</span>}
              </div>
              <p className="ko" style={{ margin: '6px 0 0', fontSize: 14, lineHeight: 1.5 }}>{f.recommendation}</p>
              {f.productType && <div className="ko" style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>제형 · {f.productType}</div>}
            </div>
          ))}
        </>
      )}

      <SectionTitle eyebrow="RECOMMENDED LOOKS" title="추천 룩 3" />
      {looks.map((l, i) => (
        <StyleCard key={l.rank || i} n={l.rank || i + 1} title={l.mood} sub={l.makeup?.lip ? `립 · ${l.makeup.lip}` : l.coachComment} moodLabel={l.moodLabel} onOpen={() => onOpenLook?.(l)} testId={`makeup-look-${l.rank || i + 1}`} />
      ))}

      {makeup.avoid?.makeup && (
        <>
          <SectionTitle eyebrow="AVOID" title="피하면 좋은 메이크업" />
          <div className="wf-card" style={{ padding: 16, marginTop: 10, borderColor: 'var(--color-line-strong)' }}>
            {['shading', 'blush', 'lip'].map((k) => makeup.avoid.makeup[k] ? (
              <div key={k} className="ko" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
                <strong>{makeup.avoid.makeup[k]}</strong>
                {makeup.avoid.makeup[`${k}Reason`] && <span style={{ color: 'var(--color-text-muted)' }}> — {makeup.avoid.makeup[`${k}Reason`]}</span>}
              </div>
            ) : null)}
          </div>
        </>
      )}
    </div>
  );
}
