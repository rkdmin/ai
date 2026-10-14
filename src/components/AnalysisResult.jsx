import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { MOOD_KR } from '../api/moodPalette';
import shareAsset from '../assets/figma/share.svg';
import dividerAsset from '../assets/figma/result-divider.svg';

function moodTitle(result) {
  if (result?.styleLabel) return result.styleLabel.split(' · ')[0] || result.styleLabel;
  return '나의 Beauty Mood';
}

export default function AnalysisResult({ result, photoUrl, onCardList, onShare, onBack }) {
  const faceType = result?.faceType || '';
  const personalColor = result?.personalColor || '';
  const moods = Array.isArray(result?.moodArchetype) ? result.moodArchetype.slice(0, 3) : [];
  const primary = moods[0] || '';
  const relatedMoods = moods.slice(1, 3);
  const features = (result?.features || []).slice(0, 3);

  return (
    <div className="wf-screen">
      <StatusBar />
      <header className="wf-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로가기" style={{ marginLeft: -12 }}>
          {Icons.back(20, '#111827')}
        </button>
        <button type="button" className="icon-btn" onClick={onShare} aria-label="결과 공유" style={{ marginRight: -10 }}>
          <img src={shareAsset} alt="" width="14" height="14" />
        </button>
      </header>

      <main className="wf-scroll" style={{ padding: '32px 20px 120px' }}>
        <section>
          <div className="wf-eyebrow">MY BEAUTY MOOD</div>
          <h1 className="ko" style={{ margin: '8px 0 12px', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.035em' }}>{moodTitle(result)}</h1>
          <p className="ko" style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            분석에서 확인된 무드를 한눈에 정리했어요.
          </p>
          <div style={{ height: 158, marginTop: 20, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
            {photoUrl ? <img src={photoUrl} alt="분석한 정면 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
        </section>

        <Divider />

        <section>
          <div className="wf-eyebrow">PRIMARY MOOD</div>
          <div className="ko" style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{primary ? (MOOD_KR[primary] || primary) : '확인된 대표 무드 없음'}</div>
          <div className="wf-eyebrow" style={{ marginTop: 20 }}>함께 나타난 무드</div>
          {relatedMoods.length > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {relatedMoods.map((mood) => <span key={mood} className="ko" style={{ padding: '6px 10px', borderRadius: 20, background: '#f3f4f6', color: '#374151', fontSize: 13, fontWeight: 600 }}>{MOOD_KR[mood] || mood}</span>)}
            </div>
          ) : <p className="ko" style={{ color: '#9ca3af', fontSize: 13, margin: '8px 0 0' }}>함께 확인된 다른 무드가 없어요.</p>}
        </section>

        <Divider />

        <section>
          <h2 className="ko" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>AI가 발견한 나의 특징</h2>
          {faceType && (
            <div style={{ marginTop: 20 }}>
              <div className="wf-eyebrow">FACE SHAPE</div>
              <div className="ko" style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{faceType}</div>
            </div>
          )}
          {personalColor && <div className="ko" style={{ marginTop: 6, color: '#6b7280', fontSize: 13 }}>{personalColor}</div>}
          <div className="wf-eyebrow" style={{ marginTop: 20 }}>{features.length > 0 ? `TOP ${features.length} FEATURES` : 'FEATURES'}</div>
          {features.length > 0 ? (
            <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {features.map((feature) => <li key={feature} className="ko" style={{ display: 'flex', gap: 8, color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}><strong aria-hidden="true">•</strong><span>{feature}</span></li>)}
            </ul>
          ) : (
            <p className="ko" style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>뚜렷하게 두드러지는 특징 없이 전체적으로 균형 잡힌 얼굴이에요.</p>
          )}
        </section>

        <Divider />

        <section>
          <h2 className="ko" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>나에게 어울리는 스타일 방향</h2>
          <p className="ko" style={{ margin: '12px 0 20px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>분석 결과를 바탕으로 헤어와 메이크업 추천을 확인해보세요.</p>
          {result?.analysisId && (
            <div className="wf-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12, background: '#f9fafb' }}>
              {Icons.check(14, '#6b7280')}
              <span className="ko" style={{ fontSize: 12, color: '#6b7280' }}>이 분석은 히스토리에 저장됐어요</span>
            </div>
          )}
          <button type="button" className="wf-btn-primary" onClick={() => onCardList?.('hair')}>
            <span style={{ flex: 1, textAlign: 'left' }}><small style={{ display: 'block', opacity: .65, fontSize: 10, letterSpacing: '.08em', marginBottom: 4 }}>1ST · START HERE</small>헤어 추천 보기</span>{Icons.arrow(18, '#fff')}
          </button>
          <button type="button" className="wf-btn-secondary" onClick={() => onCardList?.('makeup')} style={{ marginTop: 10 }}>
            <span style={{ flex: 1, textAlign: 'left' }}>메이크업 추천 보기</span>{Icons.arrow(18, '#111827')}
          </button>
        </section>
      </main>
    </div>
  );
}

function Divider() {
  return (
    <div style={{ width: '100%', overflow: 'hidden', margin: '28px 0 24px' }} aria-hidden="true">
      <img src={dividerAsset} alt="" width="350" height="1" style={{ display: 'block' }} />
    </div>
  );
}
