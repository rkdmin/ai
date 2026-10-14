export const MOOD_TITLE_FALLBACK = '나의 Beauty Mood';
export const MOOD_SUMMARY_FALLBACK = '대표 무드의 분위기를 중심으로 추천을 준비했어요.';

function strings(value, limit) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).slice(0, limit) : [];
}

export function orderedMoodArchetypes(result) {
  const primary = typeof result?.primaryMood === 'string' ? result.primaryMood : null;
  const moods = strings(result?.moodArchetype, 3);
  return [...new Set([primary, ...moods].filter(Boolean))].slice(0, 3);
}

export function moodProfileData(result) {
  if (!result || result.legacy === true) return null;
  return {
    title: result.moodTitle || MOOD_TITLE_FALLBACK,
    primaryMood: result.primaryMood || null,
    traits: strings(result.traits, 2),
    summary: result.moodSummary || MOOD_SUMMARY_FALLBACK,
    evidence: strings(result.moodEvidence, 3),
    distinctivePoint: result.distinctivePoint || null,
    hairDirection: result.hairDirection || null,
    makeupDirection: result.makeupDirection || null,
    moods: orderedMoodArchetypes(result),
  };
}
