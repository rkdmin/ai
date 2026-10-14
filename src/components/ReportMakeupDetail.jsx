// 메이크업 추천 상세 — Figma makeup-recommendation-detail(108:3481). plan 0009 F04.
// 리포트 looks[n] 하나를 펼친다. 사진 합성은 없다 (메이크업 TRY ON 미지원). 제품은 브랜드 없는 제형·형태만.
// "관련 제품 둘러보기" 는 제품 목록 화면(F07 UI)이 생기면 onProducts 로 연결한다 — 없으면 버튼을 숨긴다.
import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { moodLabelText } from '../utils/moodLabel';

const PARTS = [
  ['shading', '쉐딩'], ['highlight', '하이라이트'], ['blush', '블러셔'], ['eyebrow', '눈썹'], ['lip', '립'], ['eyeshadow', '아이섀도우'], ['eyeliner', '아이라이너'],
];

export default function ReportMakeupDetail({ look, analysis, onBack, onShare, onProducts }) {
  if (!look) return null;
  const n = look.rank || 1;
  const mk = look.makeup || {};
  const parts = PARTS.filter(([k]) => mk[k]);
  return (
    <div className="wf-screen">
      <StatusBar />
      <header className="wf-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로가기" style={{ marginLeft: -12 }}>
          {Icons.back(20, '#111827')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wf-eyebrow">{`MAKEUP · Nº 0${n}${look.moodLabel ? ` · ${moodLabelText(look.moodLabel)}` : ''}`}</div>
          <div className="ko" style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{look.mood}</div>
        </div>
        <button type="button" className="icon-btn" onClick={onShare} aria-label="공유" style={{ marginRight: -10 }}>
          {Icons.share(16, '#111827')}
        </button>
      </header>

      <main className="wf-scroll" style={{ padding: '24px 20px 120px' }}>
        <h1 className="ko" style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.3 }}>{look.mood}</h1>
        {look.baseSkin && <div className="ko" style={{ marginTop: 6, color: 'var(--color-text-muted)', fontSize: 13 }}>피부 표현 · {look.baseSkin}</div>}
        {(analysis?.faceType || (analysis?.traits || []).length > 0) && (
          <div style={{ marginTop: 10 }}>
            {analysis?.faceType && <Chip>{analysis.faceType}</Chip>}
            {(analysis?.traits || []).map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
        )}

        <section style={{ marginTop: 26 }}>
          <div className="wf-eyebrow">PART GUIDE</div>
          <h2 className="ko" style={{ margin: '6px 0 4px', fontSize: 16, fontWeight: 700 }}>부위별 가이드</h2>
          {parts.map(([k, label]) => (
            <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-line)' }}>
              <div className="wf-eyebrow" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
              <div className="ko" style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{mk[k]}</div>
              {mk[`${k}Reason`] && <p className="ko" style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>{mk[`${k}Reason`]}</p>}
            </div>
          ))}
        </section>

        {(look.applyOrder || []).length > 0 && (
          <section style={{ marginTop: 26 }}>
            <div className="wf-eyebrow">APPLY ORDER</div>
            <h2 className="ko" style={{ margin: '6px 0 10px', fontSize: 16, fontWeight: 700 }}>적용 순서</h2>
            <ol className="ko" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6, fontSize: 14, lineHeight: 1.5 }}>
              {look.applyOrder.map((step, i) => <li key={`${i}-${step}`}>{step}</li>)}
            </ol>
          </section>
        )}

        {(look.productTypes || []).length > 0 && (
          <section style={{ marginTop: 26 }}>
            <div className="wf-eyebrow">PRODUCT TYPES</div>
            <h2 className="ko" style={{ margin: '6px 0 10px', fontSize: 16, fontWeight: 700 }}>필요한 제형·형태</h2>
            <div>{look.productTypes.map((p) => <Chip key={p}>{p}</Chip>)}</div>
            <p className="ko" style={{ margin: '10px 0 0', color: 'var(--color-text-subtle)', fontSize: 12, lineHeight: 1.5 }}>브랜드·상품은 STYLE 의 추천 제품에서 골라요.</p>
            {onProducts && (
              <button type="button" className="wf-btn-secondary" onClick={onProducts} style={{ marginTop: 12 }}>관련 제품 둘러보기 {Icons.arrow(16, '#111827')}</button>
            )}
          </section>
        )}

        {look.featureTip && (
          <section style={{ marginTop: 26 }}>
            <div className="wf-eyebrow">FEATURE TIP</div>
            <p className="ko" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{look.featureTip}</p>
          </section>
        )}

        {look.coachComment && (
          <section style={{ marginTop: 26 }}>
            <div className="wf-eyebrow">COACH COMMENT</div>
            <p className="ko" style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>{look.coachComment}</p>
          </section>
        )}
      </main>
    </div>
  );
}

function Chip({ children }) {
  return <span className="ko" style={{ display: 'inline-block', margin: '4px 6px 0 0', padding: '5px 9px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-pill)', fontSize: 12, color: 'var(--color-text-muted)' }}>{children}</span>;
}
