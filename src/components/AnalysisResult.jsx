import { StatusBar } from './common/StatusBar';
import { Icons } from './common/Icons';
import { IndexMark } from './common/Layout';
import { FacePlaceholder } from './common/Placeholders';
import { MOOD_KR, MOOD_PALETTES as MOOD_COLORS } from '../api/moodPalette';

// 백엔드 응답 → 감성 라벨 ("봄날의 햇살형" 같은) 매핑.
// TODO: Gemini 가 응답에 styleLabel(또는 emotionalLabel) 을 포함하도록 프롬프트 보강.
//   현재는 faceType + 첫 번째 mood 로 임시 라벨 생성.
function emotionalLabel(result) {
  if (result?.styleLabel) return result.styleLabel.split(' · ')[0] || result.styleLabel;
  return '봄날의 햇살형';
}

export default function AnalysisResult({ result, photoUrl, onCardList, onShare }) {
  const faceType = result?.faceType || '계란형';
  const personalColor = result?.personalColor || '봄 웜톤';
  const moods = (result?.moodArchetype && result.moodArchetype.length === 3)
    ? result.moodArchetype
    : ['ROMANTIC', 'CLEAN', 'SOFT'];
  const features = (result?.features && result.features.length > 0)
    ? result.features.slice(0, 3)
    : ['균형잡힌 비율', '입체적인 골격', '부드러운 눈매'];

  const label = emotionalLabel(result);
  const [labelHead, labelTail] = splitLabel(label);

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 14px 6px', flexShrink: 0, minHeight: 52 }}>
        <span className="label" style={{ paddingLeft: 8 }}>RESULT</span>
        <button
          onClick={onShare}
          className="icon-btn"
          style={{ paddingLeft: 12, paddingRight: 6, gap: 6, minWidth: 0 }}
        >
          {Icons.share(16)}
          <span className="label">SHARE</span>
        </button>
      </div>
      <div style={{ height: 1, background: '#000', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ position: 'relative', aspectRatio: '1/1.15', background: '#000', overflow: 'hidden' }}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="분석한 정면 사진"
              decoding="async"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.05) contrast(1.02)' }}
            />
          ) : (
            <FacePlaceholder w="100%" h="100%" tone="dark" label="" />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,.85) 100%)' }} />
          <div className="serif-i" style={{ position: 'absolute', top: 18, right: 22, color: 'rgba(255,255,255,.55)', fontSize: 13 }}>
            nº 01 · profile
          </div>
          <div className="label" style={{ position: 'absolute', top: 18, left: 22, color: 'rgba(255,255,255,.55)' }}>YOUR LABEL</div>

          <div style={{ position: 'absolute', bottom: 24, left: 22, right: 22, color: '#fff' }}>
            <div className="ko" style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.15, letterSpacing: '-.015em', marginBottom: 8 }}>
              {labelHead}<br />{labelTail}
              <span className="serif-i" style={{ fontSize: 18, fontWeight: 300, marginLeft: 8, opacity: 0.7 }}>·</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,.7)' }}>
              <span className="ko" style={{ fontSize: 12, fontWeight: 300 }}>{faceType} · {personalColor}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />
              <span className="label" style={{ fontSize: 9.5, color: 'rgba(255,255,255,.85)' }}>HIGH-CONFIDENCE MATCH</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 22px 18px', borderBottom: '1px solid #000' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div className="label">MOOD KEYS</div>
            <IndexMark n="nº 02" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {moods.map((kw, i) => {
              const palette = MOOD_COLORS[kw] || MOOD_COLORS.ROMANTIC;
              return (
                <div key={`${kw}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ aspectRatio: '1/1.2', background: palette.c1, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 30% 30%, ${palette.c2} 0%, transparent 55%)` }} />
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,.04) 0 1px, transparent 1px 7px)' }} />
                    <span className="label" style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 9, color: 'rgba(0,0,0,.65)' }}>{kw}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="serif-i" style={{ fontSize: 13, color: '#a8a8a8' }}>nº 0{i + 1}</span>
                    <div className="ko" style={{ fontSize: 12, fontWeight: 500 }}>{MOOD_KR[kw] || kw}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '24px 22px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div className="label">TOP 3 FEATURES</div>
            <IndexMark n="nº 03" />
          </div>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid #e8e8e8' }}>
              <span className="serif-i" style={{ fontSize: 14, color: '#a8a8a8', width: 22 }}>0{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div className="ko" style={{ fontSize: 14, fontWeight: 400, letterSpacing: '-.005em' }}>{f}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ margin: '8px 22px 30px' }}>
          {result?.analysisId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
              {Icons.check(13, '#7a7a7a')}
              <span className="label" style={{ fontSize: 9.5, color: '#7a7a7a' }}>SAVED</span>
              <span className="ko" style={{ fontSize: 12, fontWeight: 300, color: '#7a7a7a' }}>
                이 분석은 히스토리에 저장됐어요
              </span>
            </div>
          )}

          {/* 1차 CTA — 헤어부터 보게 한다 (Phase 4: CTA 위계 정리) */}
          <button
            onClick={() => onCardList?.('hair')}
            className="tappable"
            style={{
              width: '100%', border: '1px solid #000', background: '#000', color: '#fff',
              padding: '20px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <span>
              <span className="label" style={{ display: 'block', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>
                1ST · START HERE
              </span>
              <span className="ko" style={{ display: 'block', fontSize: 17, fontWeight: 400, letterSpacing: '-.01em' }}>
                헤어 추천 보기
              </span>
            </span>
            {Icons.arrow(20, '#fff')}
          </button>

          {/* 2차 CTA — 메이크업 (시각 비중 낮춤) */}
          <button
            onClick={() => onCardList?.('makeup')}
            className="tappable"
            style={{
              width: '100%', border: '1px solid #000', borderTop: 'none', background: '#fff', color: '#000',
              padding: '16px 18px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', textAlign: 'left', cursor: 'pointer',
            }}
          >
            <span>
              <span className="label" style={{ display: 'block', color: '#7a7a7a', marginBottom: 6 }}>
                MAKEUP
              </span>
              <span className="ko" style={{ display: 'block', fontSize: 14, fontWeight: 400, letterSpacing: '-.005em' }}>
                메이크업 추천 보기
              </span>
            </span>
            {Icons.arrow(18, '#000')}
          </button>
        </div>
      </div>
    </div>
  );
}

// 감성 라벨을 두 줄로 쪼갠다. "봄날의 햇살형" → ["봄날의","햇살형"].
// 공백이 있으면 마지막 토큰을 두 번째 줄로, 없으면 한 줄.
function splitLabel(s) {
  if (!s) return ['', ''];
  const idx = s.lastIndexOf(' ');
  if (idx <= 0) return [s, ''];
  return [s.slice(0, idx).trim(), s.slice(idx + 1)];
}
