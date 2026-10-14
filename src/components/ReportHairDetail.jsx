// 헤어 추천 상세 — Figma hair-recommendation-detail(108:3410). plan 0009 F04·F06.
// 리포트 styles[n] 하나를 펼친다. TRY ON 은 광고 없이 바로 합성(F06), 결과는 같은 화면에 표시.
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { moodLabelText } from '../utils/moodLabel';

export default function ReportHairDetail({ style, analysis, photoUrl, synthesizedPhoto, canTryOn = true, onBack, onShare, onTryOn }) {
  if (!style) return null;
  const n = style.rank || 1;
  return (
    <div className="wf-screen">
      <StatusBar />
      <header className="wf-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로가기" style={{ marginLeft: -12 }}>
          {Icons.back(20, '#111827')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-eyebrow">{`HAIR · Nº 0${n}${style.moodLabel ? ` · ${moodLabelText(style.moodLabel)}` : ''}`}</div>
          <div className="ko" style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{style.hair}</div>
        </div>
        <button type="button" className="icon-btn" onClick={onShare} aria-label="공유" style={{ marginRight: -10 }}>
          {Icons.share(16, '#111827')}
        </button>
      </header>

      <main className="wf-scroll" style={{ padding: '24px 20px 140px' }}>
        <div style={{ height: 220, background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {synthesizedPhoto
            ? <img src={synthesizedPhoto} alt={`${style.hair} 합성 결과`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : photoUrl
              ? <img src={photoUrl} alt="내 정면 사진" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .6 }} />
              : <span className="wf-eyebrow">STYLE IMAGE</span>}
        </div>

        <h1 className="ko" style={{ margin: '20px 0 0', fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.3 }}>{style.hair}</h1>
        {style.bangs && <div className="ko" style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: 13 }}>앞머리 · {style.bangs}</div>}

        <Block eyebrow="WHY IT FITS" title="왜 어울리나요">
          {style.hairReason && <P>{style.hairReason}</P>}
          {style.structureReason && <P muted>{style.structureReason}</P>}
          {analysis?.faceType && <Chip>{analysis.faceType}</Chip>}
          {(analysis?.traits || []).map((t) => <Chip key={t}>{t}</Chip>)}
        </Block>

        {style.stylingNote && (
          <Block eyebrow="STYLING NOTE" title="집에서 연출하기"><P>{style.stylingNote}</P></Block>
        )}

        {style.featureTip && (
          <Block eyebrow="FEATURE TIP" title="내 이목구비에 맞춘 팁"><P>{style.featureTip}</P></Block>
        )}

        {style.alternative && (
          <Block eyebrow="ALTERNATIVE" title="비슷한 효과의 대안"><P>{style.alternative}</P></Block>
        )}

        {style.salonRequest && (
          <Block eyebrow="SALON REQUEST" title="미용실에서 이렇게 말해 보세요">
            <div className="wf-card" style={{ padding: 16, background: 'var(--color-surface)', border: 0 }}>
              <p className="ko" style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{style.salonRequest}</p>
            </div>
          </Block>
        )}

        {style.coachComment && (
          <Block eyebrow="COACH COMMENT" title="코치의 한마디"><P muted>{style.coachComment}</P></Block>
        )}
      </main>

      {canTryOn && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 20px max(env(safe-area-inset-bottom), 16px)', background: '#fff', borderTop: '1px solid var(--color-line)' }}>
          <button type="button" className="wf-btn-primary" onClick={() => onTryOn?.(style)}>
            {Icons.play(14, '#fff')} {synthesizedPhoto ? '다시 합성해 보기' : 'TRY ON · 내 얼굴에 입혀 보기'}
          </button>
        </div>
      )}
    </div>
  );
}

function Block({ eyebrow, title, children }) {
  return (
    <section style={{ marginTop: 26 }}>
      <div className="wf-eyebrow">{eyebrow}</div>
      <h2 className="ko" style={{ margin: '6px 0 10px', fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children, muted }) {
  return <p className="ko" style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: muted ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{children}</p>;
}

function Chip({ children }) {
  return <span className="ko" style={{ display: 'inline-block', margin: '4px 6px 0 0', padding: '5px 9px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-pill)', fontSize: 12, color: 'var(--color-text-muted)' }}>{children}</span>;
}
