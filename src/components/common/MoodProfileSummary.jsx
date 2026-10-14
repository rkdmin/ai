import { MOOD_KR } from '../../api/moodPalette';
import { moodProfileData } from '../../utils/moodProfile';

export default function MoodProfileSummary({ result, titleSize = 18 }) {
  const profile = moodProfileData(result);
  if (!profile) return null;

  const primaryLine = profile.primaryMood
    ? ['Primary', profile.primaryMood, ...profile.traits].join(' · ')
    : null;

  return (
    <div data-testid="mood-profile-summary">
      <div className="ko" style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.35 }}>{profile.title}</div>
      {primaryLine && <div className="ko" style={{ marginTop: 8, color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }}>{primaryLine}</div>}
      <p className="ko" style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1.5 }}>{profile.summary}</p>
      {profile.moods.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }} aria-label="Beauty Mood">
          {profile.moods.map((mood) => <span key={mood} className="ko" style={{ padding: '5px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600 }}>{MOOD_KR[mood] || mood}</span>)}
        </div>
      )}
      {profile.evidence.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }} aria-label="무드 근거">
          {profile.evidence.map((item) => <span key={item} className="ko" style={{ padding: '5px 8px', border: '1px solid var(--color-line)', borderRadius: 'var(--radius-pill)', color: 'var(--color-text-muted)', fontSize: 12 }}>{item}</span>)}
        </div>
      )}
      {profile.distinctivePoint && <p className="ko" style={{ margin: '10px 0 0', color: 'var(--color-text-secondary)', fontSize: 12.5, lineHeight: 1.5 }}>{profile.distinctivePoint}</p>}
      {(profile.hairDirection || profile.makeupDirection) && (
        <div className="ko" style={{ marginTop: 10, display: 'grid', gap: 4, color: 'var(--color-text-muted)', fontSize: 12, lineHeight: 1.45 }}>
          {profile.hairDirection && <div>헤어 · {profile.hairDirection}</div>}
          {profile.makeupDirection && <div>메이크업 · {profile.makeupDirection}</div>}
        </div>
      )}
    </div>
  );
}
