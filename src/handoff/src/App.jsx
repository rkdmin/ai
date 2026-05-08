import { useState } from 'react';
import PhotoUpload from './components/PhotoUpload';
import Loading from './components/Loading';
import AnalysisResult from './components/AnalysisResult';
import CardList from './components/CardList';
import CardDetail from './components/CardDetail';
import AdGate from './components/AdGate';
import ShareCard from './components/ShareCard';
import './styles/tokens.css';
import './styles/globals.css';

// Stages: upload → loading → result → cardList(hair|makeup) → cardDetail
//         (ad gate as overlay; share card as overlay)
export default function App() {
  const [stage, setStage] = useState('upload');
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [cardListType, setCardListType] = useState('hair');
  const [activeCard, setActiveCard] = useState(null);
  const [overlay, setOverlay] = useState(null); // 'ad-list' | 'ad-synth' | 'share'

  // Mock analysis. Replace with real API call (apiClient.analyze)
  const startAnalysis = (photoData) => {
    setPhoto(photoData);
    setStage('loading');
  };

  const onAnalysisDone = () => {
    // TODO: Claude Code — replace mock with: const r = await apiClient.analyze(photo)
    // Backend may still return celebrity fields; ignore them on the frontend.
    setResult({
      faceType: '계란형',
      features: ['균형잡힌 비율', '부드러운 눈매', '좁은 이마'],
      moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'],
    });
    setStage('result');
  };

  // ---- Stage rendering ----
  let view;
  if (stage === 'upload') view = <PhotoUpload onUpload={(_file, dataUrl) => startAnalysis(dataUrl)} />;
  else if (stage === 'loading') view = <Loading onCancel={() => setStage('upload')} onDone={onAnalysisDone} />;
  else if (stage === 'result') view = (
    <AnalysisResult
      result={result}
      onCardList={(type) => { setCardListType(type); setStage('cardList'); }}
      onShare={() => setOverlay('share')}
      onBack={() => setStage('upload')}
    />
  );
  else if (stage === 'cardList') view = (
    <CardList
      type={cardListType}
      onCard={(card) => {
        if (card.locked) {
          setActiveCard(card);
          setOverlay('ad-list');
        } else {
          setActiveCard(card);
          setStage('cardDetail');
        }
      }}
      onBack={() => setStage('result')}
    />
  );
  else if (stage === 'cardDetail') view = (
    <CardDetail
      card={activeCard}
      type={cardListType}
      onBack={() => setStage('cardList')}
      onShare={() => setOverlay('share')}
      onSynthesize={() => setOverlay('ad-synth')}
    />
  );

  // ---- Overlays ----
  let overlayView = null;
  if (overlay === 'ad-list') overlayView = (
    <AdGate
      onBack={() => setOverlay(null)}
      onDone={() => { setOverlay(null); setStage('cardDetail'); }}
    />
  );
  if (overlay === 'ad-synth') overlayView = (
    <AdGate onBack={() => setOverlay(null)} onDone={() => setOverlay(null)} />
  );
  if (overlay === 'share') overlayView = (
    <ShareCard
      result={result}
      card={activeCard}
      onClose={() => setOverlay(null)}
      onCopy={() => alert('링크가 복사되었어요')}
      onSave={() => alert('이미지를 저장했어요')}
    />
  );

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fff', position: 'relative' }}>
      {overlayView ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, maxWidth: 480, margin: '0 auto' }}>{overlayView}</div>
      ) : null}
      {view}
    </div>
  );
}
