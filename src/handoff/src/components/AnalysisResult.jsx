import { Icons } from './common/Icons';
import { Section, BackHeader, IndexMark, CtaTile } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';

const MOOD_KEYS = [
  { en: 'ROMANTIC', kr: '로맨틱', tone: 'warm', desc: '부드럽고 사랑스러운' },
  { en: 'CLEAN', kr: '클린', tone: 'cool', desc: '깨끗하고 단정한' },
  { en: 'SOFT', kr: '소프트', tone: 'light', desc: '자연스럽고 차분한' },
];

export default function AnalysisResult({ result, onCardList, onShare, onBack }) {
  // result shape (flexible): { faceType, features, faceRatios, moodArchetype }
  const faceType = result?.faceType || '계란형';
  const features = result?.features || ['균형잡힌 비율', '부드러운 눈매', '좁은 이마'];
  const moods = result?.moodArchetype && result.moodArchetype.length > 0
    ? result.moodArchetype.map((m) => {
        const found = MOOD_KEYS.find((k) => k.en === m);
        return found || { en: m, kr: '', tone: 'light', desc: '' };
      })
    : MOOD_KEYS;

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <BackHeader
        label="STEP 02 · ANALYSIS RESULT"
        title="분석 완료"
        onBack={onBack}
        right={<button onClick={onShare} style={{ background: 'none', border: 'none', padding: 6 }}>{Icons.share(16)}</button>}
      />

      {/* Hero */}
      <div style={{ aspectRatio: '1/0.95', background: '#000', position: 'relative' }}>
        <FacePlaceholder w="100%" h="100%" tone="dark" label="your face" />
        <div style={{ position: 'absolute', bottom: 18, left: 22, right: 22, color: '#fff' }}>
          <div className="label" style={{ color: 'rgba(255,255,255,.6)', marginBottom: 8 }}>FACE TYPE</div>
          <div className="ko" style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-.02em' }}>{faceType}</div>
        </div>
      </div>

      {/* Mood Keys */}
      <Section n="01" en="MOOD KEYS" kr="내 얼굴 무드">
        <div style={{ display: 'flex', gap: 8 }}>
          {moods.map((m, i) => (
            <div key={i} style={{ flex: 1, border: '1px solid #000', padding: '14px 12px', minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <span className="serif-i" style={{ fontSize: 12, color: '#a8a8a8' }}>0{i + 1}</span>
              </div>
              <div>
                <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>{m.en}</div>
                <div className="ko" style={{ fontSize: 11, color: '#7a7a7a', fontWeight: 300, lineHeight: 1.4 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section n="02" en="FEATURES" kr="얼굴 특징">
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: i < features.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
            <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8', width: 22, flexShrink: 0 }}>0{i + 1}</span>
            <div className="ko" style={{ fontSize: 13, fontWeight: 400 }}>{f}</div>
          </div>
        ))}
      </Section>

      {/* CTAs */}
      <Section n="03" en="RECOMMENDATIONS" kr="맞춤 추천 카드" last>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CtaTile fullWidth dark kicker="HAIR · 4 CARDS" title="헤어 스타일 추천 보기" sub="베스트 1 · 비추천 1 · 광고 잠금 2" onClick={() => onCardList?.('hair')} />
          <CtaTile fullWidth kicker="MAKEUP · 4 CARDS" title="메이크업 추천 보기" sub="베스트 1 · 비추천 1 · 광고 잠금 2" onClick={() => onCardList?.('makeup')} />
        </div>
      </Section>
    </div>
  );
}
