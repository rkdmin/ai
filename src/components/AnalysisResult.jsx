import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { MOOD_KR } from '../api/moodPalette';
import { moodProfileData, orderedMoodArchetypes } from '../utils/moodProfile';
import shareAsset from '../assets/figma/share.svg';
import dividerAsset from '../assets/figma/result-divider.svg';

export default function AnalysisResult({ result, photoUrl, onReport, onShare, onBack }) {
  const faceType = result?.faceType || '';
  const personalColor = result?.personalColor || '';
  const profile = moodProfileData(result);
  const moods = orderedMoodArchetypes(result);
  const features = (result?.features || []).slice(0, 3);
  const primaryLine = profile?.primaryMood
    ? ['Primary', profile.primaryMood, ...profile.traits].join(' · ')
    : null;

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
          {profile ? (
            <div data-testid="mood-profile">
              <div className="wf-eyebrow">MY BEAUTY MOOD</div>
              <h1 className="ko" style={{ margin: '8px 0 12px', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.035em' }}>{profile.title}</h1>
              <p className="ko" style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>{profile.summary}</p>
            </div>
          ) : (
            <div data-testid="legacy-result-heading">
              <div className="wf-eyebrow">SAVED ANALYSIS</div>
              <h1 className="ko" style={{ margin: '8px 0 12px', fontSize: 28, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-.035em' }}>{faceType || '분석 결과'}</h1>
              <p className="ko" style={{ color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5, margin: 0 }}>이전 버전에서 저장된 정보만 표시해요.</p>
            </div>
          )}
          <div style={{ height: 158, marginTop: 20, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
            {photoUrl ? <img src={photoUrl} alt="분석한 정면 사진" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
        </section>

        <Divider />

        {profile ? (
          <section data-testid="mood-profile-details">
            {primaryLine && <div className="ko" style={{ fontSize: 18, fontWeight: 700 }}>{primaryLine}</div>}
            {moods.length > 0 && (
              <>
                <div className="wf-eyebrow" style={{ marginTop: primaryLine ? 20 : 0 }}>BEAUTY MOODS</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }} aria-label="Beauty Mood">
                  {moods.map((mood) => <span key={mood} className="ko" style={{ padding: '6px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }}>{MOOD_KR[mood] || mood}</span>)}
                </div>
              </>
            )}
            {profile.evidence.length > 0 && (
              <>
                <div className="wf-eyebrow" style={{ marginTop: 20 }}>MOOD EVIDENCE</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }} aria-label="무드 근거">
                  {profile.evidence.map((item) => <span key={item} className="ko" style={{ padding: '6px 10px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-pill)', color: 'var(--color-text-muted)', fontSize: 13 }}>{item}</span>)}
                </div>
              </>
            )}
          </section>
        ) : moods.length > 0 ? (
          <section data-testid="legacy-moods">
            <div className="wf-eyebrow">저장된 무드</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {moods.map((mood) => <span key={mood} className="ko" style={{ padding: '6px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }}>{MOOD_KR[mood] || mood}</span>)}
            </div>
          </section>
        ) : null}

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

        {profile?.distinctivePoint && (
          <>
            <Divider />
            <section className="wf-card" style={{ padding: 20 }}>
              <div className="wf-eyebrow">MY DISTINCTIVE POINT</div>
              <p className="ko" style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.5 }}>{profile.distinctivePoint}</p>
            </section>
          </>
        )}

        <Divider />

        <section>
          <h2 className="ko" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>나에게 어울리는 스타일 방향</h2>
          {(profile?.hairDirection || profile?.makeupDirection) && (
            <div className="ko" style={{ margin: '12px 0 20px', display: 'grid', gap: 6, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.5 }}>
              {profile.hairDirection && <div>헤어 · {profile.hairDirection}</div>}
              {profile.makeupDirection && <div>메이크업 · {profile.makeupDirection}</div>}
            </div>
          )}
          {result?.analysisId && (
            <div className="wf-card" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, marginBottom: 12, background: '#f9fafb' }}>
              {Icons.check(14, '#6b7280')}
              <span className="ko" style={{ fontSize: 12, color: '#6b7280' }}>이 분석은 히스토리에 저장됐어요</span>
            </div>
          )}
          {/* Figma 158:657/108:2862 — "전체 Beauty Report 보기" (연결선 → 결제/리포트). 카드 4장 CTA 는 리포트로 대체됐다 (F04). */}
          <button type="button" className="wf-btn-primary" onClick={onReport}>
            <span style={{ flex: 1, textAlign: 'left' }}><small style={{ display: 'block', opacity: .65, fontSize: 10, letterSpacing: '.08em', marginBottom: 4 }}>HAIR + MAKEUP · FULL GUIDE</small>전체 Beauty Report 보기</span>{Icons.arrow(18, '#fff')}
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
