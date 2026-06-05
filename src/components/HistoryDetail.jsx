import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from './common/StatusBar';
import { BackHeader, Section } from './common/Layout';
import { StateNotice } from './common/StateNotice';
import { FacePlaceholder } from './common/Placeholders';
import { fetchHistoryDetail } from '../api/ai';
import { mapCards } from '../api/mappers';

function flattenCards(detailCards) {
  const groups = { hair: [], makeup: [], total: [] };
  for (const entry of detailCards || []) {
    const cards = Array.isArray(entry) ? entry : [entry];
    const type = cards[0]?.cardType;
    if (!type || !groups[type]) continue;
    groups[type].push(...cards);
  }
  return groups;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`;
}

function TypeButton({ label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        background: '#fff',
        color: '#000',
        border: '1px solid #000',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div>
        <div className="label" style={{ marginBottom: 4 }}>{label}</div>
        <div className="ko" style={{ fontSize: 12.5, color: '#5a5a5a', fontWeight: 300 }}>{sub}</div>
      </div>
      <span className="label">OPEN</span>
    </button>
  );
}

export default function HistoryDetail({ analysisId, onBack, onOpenCards, onNewAnalysis }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setError('');
    fetchHistoryDetail(analysisId)
      .then((row) => {
        if (!alive) return;
        setDetail(row);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || '기록을 불러오지 못했어요.');
      });
    return () => { alive = false; };
  }, [analysisId]);

  const analysis = detail?.analysis || null;
  const cardGroups = useMemo(() => flattenCards(detail?.cards), [detail]);
  const reopenCards = (type, cards) => {
    if (!analysis) return;
    const mapped = mapCards(cards, type, { result: analysis, features: analysis.features || [] }).map((card) => ({
      ...card,
      analysisId: analysis.analysisId ?? null,
    }));
    onOpenCards?.(type, mapped, analysis);
  };

  return (
    <div style={{ width: '100%', minHeight: '100dvh', background: '#fff', color: '#000', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <BackHeader label="ARCHIVE DETAIL" title="기록 상세" onBack={onBack} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {detail === null && !error && (
          <StateNotice variant="loading" eyebrow="LOADING" message="분석 기록을 불러오는 중이에요" />
        )}

        {error && (
          <StateNotice variant="error" eyebrow="LOAD FAILED" message={error} />
        )}

        {analysis && (
          <>
            <div style={{ position: 'relative', aspectRatio: '1/1.04', background: '#000', overflow: 'hidden' }}>
              <FacePlaceholder w="100%" h="100%" tone={analysis.photoExpired ? 'light' : 'dark'} label="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 42%,rgba(0,0,0,.85) 100%)' }} />
              <div className="label" style={{ position: 'absolute', top: 16, left: 18, color: 'rgba(255,255,255,.62)' }}>ANALYSIS</div>
              <div className="serif-i" style={{ position: 'absolute', top: 16, right: 18, color: 'rgba(255,255,255,.62)', fontSize: 13 }}>
                {formatDate(analysis.createdAt)}
              </div>
              <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18, color: '#fff' }}>
                <div className="ko" style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.2, letterSpacing: '-.01em', marginBottom: 8 }}>
                  {analysis.faceType || '분석 결과'}
                </div>
                <div className="ko" style={{ fontSize: 12.5, color: 'rgba(255,255,255,.72)', fontWeight: 300 }}>
                  {[analysis.personalColor, analysis.photoExpired ? '사진 만료' : null].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>

            <Section n="01" en="SUMMARY" kr="이 기록에서 확인한 포인트">
              {(analysis.features || []).length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {analysis.features.map((feature, index) => (
                    <span key={`${feature}-${index}`} className="ko" style={{ padding: '7px 10px', border: '1px solid #000', fontSize: 12, fontWeight: 300 }}>
                      {feature}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="ko" style={{ fontSize: 12.5, color: '#7a7a7a', fontWeight: 300 }}>저장된 특징 메모가 없어요.</div>
              )}
            </Section>

            <Section n="02" en="CARD SETS" kr="다시 열어볼 카드 결과">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cardGroups.hair.length > 0 && (
                  <TypeButton
                    label="HAIR"
                    sub={`저장된 헤어 카드 ${cardGroups.hair.length}개 다시 보기`}
                    onClick={() => reopenCards('hair', cardGroups.hair)}
                  />
                )}
                {cardGroups.makeup.length > 0 && (
                  <TypeButton
                    label="MAKEUP"
                    sub={`저장된 메이크업 카드 ${cardGroups.makeup.length}개 다시 보기`}
                    onClick={() => reopenCards('makeup', cardGroups.makeup)}
                  />
                )}
                {cardGroups.total.length > 0 && (
                  <div style={{ padding: '13px 14px', background: '#f6f1ed', borderLeft: '2px solid #000' }}>
                    <div className="label" style={{ marginBottom: 4 }}>TOTAL</div>
                    <div className="ko" style={{ fontSize: 12.5, color: '#5a5a5a', lineHeight: 1.6, fontWeight: 300 }}>
                      종합 카드 기록도 저장되어 있지만, 현재 UI에서는 헤어와 메이크업 카드부터 다시 볼 수 있어요.
                    </div>
                  </div>
                )}
                {cardGroups.hair.length === 0 && cardGroups.makeup.length === 0 && cardGroups.total.length === 0 && (
                  <div className="ko" style={{ fontSize: 12.5, color: '#7a7a7a', fontWeight: 300 }}>저장된 카드 결과가 없어요.</div>
                )}
              </div>
            </Section>

            <Section n="03" en="GENERATED PHOTOS" kr="생성해 둔 결과">
              {(detail.generatedPhotos || []).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {detail.generatedPhotos.map((photo, index) => (
                    <div key={`${photo.card_type}-${index}`} style={{ border: '1px solid #000', padding: 10 }}>
                      <div style={{ aspectRatio: '1/1.15', background: '#f6f1ed', marginBottom: 8 }}>
                        <FacePlaceholder w="100%" h="100%" tone="light" label="" />
                      </div>
                      <div className="label" style={{ marginBottom: 4 }}>{String(photo.card_type || 'PHOTO').toUpperCase()}</div>
                      <div className="ko" style={{ fontSize: 11.5, color: '#5a5a5a', fontWeight: 300 }}>
                        저장된 생성 결과가 있어요.
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ko" style={{ fontSize: 12.5, color: '#7a7a7a', fontWeight: 300 }}>생성된 결과 사진은 아직 없어요.</div>
              )}
            </Section>

            <div style={{ margin: '6px 22px 0', padding: '18px 16px', background: '#000', color: '#fff' }}>
              <div className="label" style={{ color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>NEXT</div>
              <div className="ko" style={{ fontSize: 16, fontWeight: 300, lineHeight: 1.5, marginBottom: 14 }}>
                지금 얼굴로 다시 분석해서 새 결과와 비교해보세요.
              </div>
              <button
                onClick={onNewAnalysis}
                style={{ width: '100%', background: '#fff', color: '#000', border: 'none', padding: '14px 0', fontFamily: 'Jost', fontSize: 11, letterSpacing: '.22em', cursor: 'pointer' }}
              >
                NEW ANALYSIS
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
