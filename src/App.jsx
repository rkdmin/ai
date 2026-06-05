import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles/tokens.css';
import './styles/globals.css';

import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import Login from './components/Login';
import Home from './components/Home';
import PhotoUpload from './components/PhotoUpload';
import PersonalColor from './components/PersonalColor';
import Loading from './components/Loading';
import ErrorScreen from './components/ErrorScreen';
import AnalysisResult from './components/AnalysisResult';
import CardList from './components/CardList';
import CardDetail from './components/CardDetail';
import AdGate from './components/AdGate';
import MakeupDetail from './components/MakeupDetail';
import ShareCard from './components/ShareCard';
import Trend from './components/Trend';
import History from './components/History';
import HistoryDetail from './components/HistoryDetail';
import My from './components/My';

import { analyzeFace, generateHairCards, generateMakeupCards, generateStyledPhoto } from './api/ai';
import { mapCards } from './api/mappers';
import { useAuth } from './contexts/AuthContext';
import { consumePostAuthTarget, setPostAuthTarget } from './utils/authBridge';

const KO_TO_KEY = {
  '봄 웜톤': 'spring_warm',
  '여름 쿨톤': 'summer_cool',
  '가을 웜톤': 'autumn_warm',
  '겨울 쿨톤': 'winter_cool',
};
const KEY_TO_KO = {
  spring: '봄 웜톤',
  summer: '여름 쿨톤',
  autumn: '가을 웜톤',
  winter: '겨울 쿨톤',
};

function normalizePersonalColor(pick) {
  if (!pick) return null;
  return KEY_TO_KO[pick] || pick;
}

function backendPersonalColorKey(pickKo) {
  if (!pickKo) return null;
  return KO_TO_KEY[pickKo] || null;
}

const ONBOARDING_FLAG = 'beaumi.onboarded';

function hasOnboarded() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_FLAG) === '1';
  } catch {
    return false;
  }
}

function markOnboarded() {
  try {
    window.localStorage.setItem(ONBOARDING_FLAG, '1');
  } catch { /* noop */ }
}

function cardKey(card) {
  if (!card) return '';
  return `${card.cardType || 'hair'}-${card.rank ?? 0}-${card.name || card.hair || card.mood || ''}`;
}

const PARENT_STAGE = {
  onboarding2: 'onboarding1',
  onboarding3: 'onboarding2',
  login: 'home',
  guest_gate: 'home',
  upload: 'home',
  personal_color: 'upload',
  loading: 'home',
  error_face: 'home',
  error_network: 'home',
  result_home: 'home',
  hair_loading: 'result_home',
  result_tabs_hair: 'result_home',
  card_detail: 'result_tabs_hair',
  ad_gate: 'result_tabs_hair',
  share_card: 'result_home',
  makeup_loading: 'result_home',
  result_tabs_makeup: 'result_home',
  makeup_detail: 'result_tabs_makeup',
  share_card_makeup: 'makeup_detail',
  trend: 'home',
  history: 'home',
  history_detail: 'history',
  my: 'home',
};

export default function App() {
  const auth = useAuth();
  const [stage, setStage] = useState('splash');
  const [photo, setPhoto] = useState(null);
  const [personalColor, setPersonalColor] = useState(null);
  const [result, setResult] = useState(null);
  const [hairCards, setHairCards] = useState(null);
  const [makeupCards, setMakeupCards] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [adReturn, setAdReturn] = useState({ done: 'card_detail', back: 'result_tabs_hair' });
  const [synthByKey, setSynthByKey] = useState({});
  const [errorInfo, setErrorInfo] = useState({ type: 'face', message: '' });
  const [guestGateReason, setGuestGateReason] = useState('history');
  const [historySelection, setHistorySelection] = useState({ analysisId: null, back: 'history' });
  const taskRef = useRef(null);
  const isPopRef = useRef(false);
  const stageRef = useRef(stage);
  const adReturnRef = useRef(adReturn);
  const historySelectionRef = useRef(historySelection);

  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { adReturnRef.current = adReturn; }, [adReturn]);
  useEffect(() => { historySelectionRef.current = historySelection; }, [historySelection]);

  const go = useCallback((next) => {
    setStage(next);
    if (typeof window === 'undefined') return;
    if (isPopRef.current) {
      isPopRef.current = false;
      return;
    }
    try { window.history.pushState({ stage: next }, '', ''); } catch { /* noop */ }
  }, []);

  const openGuestGate = useCallback((reason, target) => {
    setGuestGateReason(reason);
    setPostAuthTarget(target);
    go('guest_gate');
  }, [go]);

  const openHistoryDetail = useCallback((analysisId, back = 'history') => {
    if (!analysisId) return;
    if (!auth.isAuthenticated) {
      openGuestGate('history_detail', { kind: 'history_detail', analysisId, back });
      return;
    }
    setHistorySelection({ analysisId, back });
    go('history_detail');
  }, [auth.isAuthenticated, go, openGuestGate]);

  const navTab = useCallback((tab) => {
    const allowed = ['home', 'trend', 'history', 'my'];
    if (!allowed.includes(tab)) return;
    if ((tab === 'history' || tab === 'my') && !auth.isAuthenticated) {
      openGuestGate(tab, { kind: 'tab', stage: tab });
      return;
    }
    go(tab);
  }, [auth.isAuthenticated, go, openGuestGate]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    try { window.history.replaceState({ stage: 'splash' }, '', ''); } catch { /* noop */ }

    const onPop = () => {
      const cur = stageRef.current;
      const parent = cur === 'history_detail'
        ? (historySelectionRef.current.back || 'history')
        : cur === 'ad_gate'
          ? (adReturnRef.current.back || PARENT_STAGE[cur])
          : PARENT_STAGE[cur];
      if (!parent) {
        try { window.history.pushState({ stage: cur }, '', ''); } catch { /* noop */ }
        return;
      }
      isPopRef.current = true;
      setStage(parent);
    };
    window.addEventListener('popstate', onPop);

    let appListenerHandle = null;
    (async () => {
      try {
        const mod = await import('@capacitor/app');
        if (mod?.App?.addListener) {
          const handle = await mod.App.addListener('backButton', () => onPop());
          appListenerHandle = handle;
        }
      } catch { /* noop */ }
    })();

    return () => {
      window.removeEventListener('popstate', onPop);
      try { appListenerHandle?.remove?.(); } catch { /* noop */ }
    };
  }, []);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const target = consumePostAuthTarget();
    if (!target) return;
    if (target.kind === 'tab' && target.stage) {
      go(target.stage);
      return;
    }
    if (target.kind === 'history_detail' && target.analysisId) {
      setHistorySelection({ analysisId: target.analysisId, back: target.back || 'history' });
      go('history_detail');
    }
  }, [auth.isAuthenticated, go]);

  const startAnalysis = useCallback(() => {
    if (!photo?.dataUrl) {
      setErrorInfo({ type: 'face', message: '사진이 준비되지 않았어요.' });
      go('error_face');
      return;
    }
    taskRef.current = analyzeFace(photo.dataUrl, backendPersonalColorKey(personalColor));
    go('loading');
  }, [photo, personalColor, go]);

  const onAnalysisSuccess = useCallback((r) => {
    if (!r || r.faceType === '판정 어려움') {
      setErrorInfo({ type: 'face', message: '얼굴 윤곽이 잘 보이는 정면 사진으로 다시 시도해주세요.' });
      go('error_face');
      return;
    }
    setResult({ ...r, personalColor: r.personalColor || personalColor });
    setHairCards(null);
    setMakeupCards(null);
    setActiveCard(null);
    setSynthByKey({});
    go('result_home');
  }, [personalColor, go]);

  const onAnalysisError = useCallback((e) => {
    const msg = String(e?.message || e || '');
    const isNet = e?.status >= 500 || /연결|네트워크|fetch|Network|timeout|high demand|try again later|temporarily|unavailable|overloaded/i.test(msg);
    setErrorInfo({ type: isNet ? 'network' : 'face', message: msg });
    go(isNet ? 'error_network' : 'error_face');
  }, [go]);

  const startCardGeneration = useCallback((type) => {
    if (!result) return;
    const payload = {
      analysisId: result.analysisId ?? null,
      faceType: result.faceType,
      personalColor: backendPersonalColorKey(result.personalColor) || null,
      features: result.features || [],
    };
    const fn = type === 'makeup' ? generateMakeupCards : generateHairCards;
    taskRef.current = fn(payload).then((arr) =>
      mapCards(arr, type, { result, features: result.features }).map((card) => ({
        ...card,
        analysisId: result.analysisId ?? null,
      })),
    );
    go(type === 'makeup' ? 'makeup_loading' : 'hair_loading');
  }, [result, go]);

  const onCardsSuccess = useCallback((type, cards) => {
    if (type === 'makeup') {
      setMakeupCards(cards);
      go('result_tabs_makeup');
    } else {
      setHairCards(cards);
      go('result_tabs_hair');
    }
  }, [go]);

  const onCardsError = useCallback((e) => {
    const msg = String(e?.message || e || '');
    setErrorInfo({ type: 'network', message: msg });
    go('error_network');
  }, [go]);

  const startSynthesis = useCallback((card) => {
    if (!card || card.cardType === 'makeup') return;
    if (!photo?.dataUrl && !card.analysisId) return;
    const key = cardKey(card);
    const cached = synthByKey[key];
    if (cached) {
      taskRef.current = Promise.resolve(cached);
    } else {
      taskRef.current = generateStyledPhoto(photo?.dataUrl || null, card);
    }
    setAdReturn({ done: 'synth_loading', back: 'card_detail' });
    go('ad_gate');
  }, [photo, synthByKey, go]);

  const onSynthSuccess = useCallback((dataUrl) => {
    if (!activeCard || !dataUrl) {
      go('card_detail');
      return;
    }
    const key = cardKey(activeCard);
    setSynthByKey((m) => (m[key] === dataUrl ? m : { ...m, [key]: dataUrl }));
    go('card_detail');
  }, [activeCard, go]);

  const onSynthError = useCallback((e) => {
    const msg = String(e?.message || e || '');
    setErrorInfo({ type: 'network', message: msg });
    go('card_detail');
  }, [go]);

  const photoUrl = photo?.dataUrl || result?.frontImageUrl || null;

  let view;
  switch (stage) {
    case 'splash':
      view = <Splash onNext={() => go(hasOnboarded() ? 'home' : 'onboarding1')} />;
      break;
    case 'onboarding1':
      view = <Onboarding idx={0} onNext={() => go('onboarding2')} onSkip={() => go('login')} />;
      break;
    case 'onboarding2':
      view = <Onboarding idx={1} onNext={() => go('onboarding3')} onSkip={() => go('login')} />;
      break;
    case 'onboarding3':
      view = <Onboarding idx={2} onNext={() => { markOnboarded(); go('login'); }} />;
      break;
    case 'login':
      view = (
        <Login
          onNext={() => { markOnboarded(); go('home'); }}
          onOAuth={(provider) => auth.signIn(provider)}
          onGuest={() => { auth.continueAsGuest(); markOnboarded(); go('home'); }}
          onTestLogin={() => { auth.signInAsTestUser(); markOnboarded(); go('home'); }}
          onBack={() => go('home')}
        />
      );
      break;
    case 'guest_gate':
      view = (
        <Login
          onNext={() => { markOnboarded(); go('home'); }}
          onOAuth={(provider) => auth.signIn(provider)}
          onGuest={() => { auth.continueAsGuest(); markOnboarded(); go('home'); }}
          onTestLogin={() => { auth.signInAsTestUser(); markOnboarded(); go('home'); }}
          onBack={() => go('home')}
          mode="guest_gate"
          reason={guestGateReason}
        />
      );
      break;
    case 'home':
      view = <Home onNext={() => go('upload')} onNav={navTab} onOpenRecent={(analysisId) => openHistoryDetail(analysisId, 'home')} canAccessHistory={auth.isAuthenticated} />;
      break;
    case 'upload':
      view = (
        <PhotoUpload
          onUpload={(file, dataUrl) => {
            setPhoto({ file, dataUrl });
            go('personal_color');
          }}
          onBack={() => go('home')}
        />
      );
      break;
    case 'personal_color':
      view = (
        <PersonalColor
          onNext={(pick) => {
            setPersonalColor(normalizePersonalColor(pick));
            startAnalysis();
          }}
          onBack={() => go('upload')}
        />
      );
      break;
    case 'loading':
      view = (
        <Loading
          task={taskRef.current}
          photoUrl={photoUrl}
          onSuccess={onAnalysisSuccess}
          onError={onAnalysisError}
          onCancel={() => go('home')}
        />
      );
      break;
    case 'error_face':
      view = (
        <ErrorScreen
          type="face"
          message={errorInfo.message}
          onRetry={() => go('upload')}
          onBack={() => go('home')}
        />
      );
      break;
    case 'error_network':
      view = (
        <ErrorScreen
          type="network"
          message={errorInfo.message}
          onRetry={() => {
            if (!hairCards && !makeupCards) {
              startAnalysis();
            } else {
              go('result_home');
            }
          }}
          onBack={() => go('home')}
        />
      );
      break;
    case 'result_home':
      view = (
        <AnalysisResult
          result={result}
          photoUrl={photoUrl}
          onCardList={(type) => {
            const cached = type === 'makeup' ? makeupCards : hairCards;
            if (cached) {
              setActiveCard(null);
              go(type === 'makeup' ? 'result_tabs_makeup' : 'result_tabs_hair');
              return;
            }
            startCardGeneration(type);
          }}
          onShare={() => {
            setActiveCard(null);
            go('share_card');
          }}
        />
      );
      break;
    case 'hair_loading':
      view = (
        <Loading
          task={taskRef.current}
          photoUrl={photoUrl}
          label="헤어 추천"
          steps={[
            { label: '얼굴형 매칭', en: 'SHAPE MATCH' },
            { label: '레퍼런스 검토', en: 'REFERENCE' },
            { label: '카드 큐레이션', en: 'CURATION' },
          ]}
          onSuccess={(cards) => onCardsSuccess('hair', cards)}
          onError={onCardsError}
          onCancel={() => go('result_home')}
        />
      );
      break;
    case 'result_tabs_hair':
      view = (
        <CardList
          type="hair"
          cards={hairCards}
          onCard={(card) => {
            setActiveCard(card);
            if (card.locked) {
              setAdReturn({ done: 'card_detail', back: 'result_tabs_hair' });
              go('ad_gate');
            } else {
              go('card_detail');
            }
          }}
          onBack={() => go('result_home')}
        />
      );
      break;
    case 'card_detail':
      view = (
        <CardDetail
          card={activeCard}
          result={result}
          photoUrl={photoUrl}
          synthesizedPhoto={activeCard ? synthByKey[cardKey(activeCard)] : null}
          onBack={() => go('result_tabs_hair')}
          onShare={() => go('share_card')}
          onSynthesize={() => startSynthesis(activeCard)}
        />
      );
      break;
    case 'synth_loading':
      view = (
        <Loading
          task={taskRef.current}
          photoUrl={photoUrl}
          label="합성 사진"
          steps={[
            { label: '얼굴 지오메트리', en: 'GEOMETRY' },
            { label: '스타일 적용', en: 'APPLY STYLE' },
            { label: '마무리', en: 'FINALIZE' },
          ]}
          onSuccess={onSynthSuccess}
          onError={onSynthError}
          onCancel={() => go('card_detail')}
        />
      );
      break;
    case 'ad_gate':
      view = (
        <AdGate
          card={activeCard}
          onDone={() => go(adReturn.done)}
          onBack={() => go(adReturn.back)}
        />
      );
      break;
    case 'share_card':
      view = (
        <ShareCard
          variant="hair"
          result={result}
          card={activeCard}
          photoUrl={photoUrl}
          synthesizedPhoto={activeCard ? synthByKey[cardKey(activeCard)] : null}
          onClose={() => go(activeCard ? 'card_detail' : 'result_home')}
        />
      );
      break;
    case 'makeup_loading':
      view = (
        <Loading
          task={taskRef.current}
          photoUrl={photoUrl}
          label="메이크업 추천"
          steps={[
            { label: '얼굴 특징 분석', en: 'FEATURES' },
            { label: '컬러 팔레트', en: 'PALETTE' },
            { label: '파트별 가이드', en: 'GUIDE' },
          ]}
          onSuccess={(cards) => onCardsSuccess('makeup', cards)}
          onError={onCardsError}
          onCancel={() => go('result_home')}
        />
      );
      break;
    case 'result_tabs_makeup':
      view = (
        <CardList
          type="makeup"
          cards={makeupCards}
          onCard={(card) => {
            setActiveCard(card);
            if (card.locked) {
              setAdReturn({ done: 'makeup_detail', back: 'result_tabs_makeup' });
              go('ad_gate');
            } else {
              go('makeup_detail');
            }
          }}
          onBack={() => go('result_home')}
        />
      );
      break;
    case 'makeup_detail':
      view = (
        <MakeupDetail
          card={activeCard}
          result={result}
          photoUrl={photoUrl}
          onBack={() => go('result_tabs_makeup')}
          onShare={() => go('share_card_makeup')}
        />
      );
      break;
    case 'share_card_makeup':
      view = (
        <ShareCard
          variant="makeup"
          result={result}
          card={activeCard}
          photoUrl={photoUrl}
          onClose={() => go('makeup_detail')}
        />
      );
      break;
    case 'trend':
      view = <Trend onNav={navTab} />;
      break;
    case 'history':
      view = <History onNav={navTab} onBack={() => go('home')} onOpenDetail={(analysisId) => openHistoryDetail(analysisId, 'history')} onNewAnalysis={() => go('upload')} />;
      break;
    case 'history_detail':
      view = (
        <HistoryDetail
          analysisId={historySelection.analysisId}
          onBack={() => go(historySelection.back || 'history')}
          onNewAnalysis={() => go('upload')}
          onOpenCards={(type, cards, analysis) => {
            setResult(analysis);
            setActiveCard(null);
            setSynthByKey({});
            if (type === 'makeup') {
              setHairCards(null);
              setMakeupCards(cards);
              go('result_tabs_makeup');
              return;
            }
            setMakeupCards(null);
            setHairCards(cards);
            go('result_tabs_hair');
          }}
        />
      );
      break;
    case 'my':
      view = <My onNav={navTab} onBack={() => go('home')} onSignOut={() => { auth.signOut(); go('login'); }} />;
      break;
    default:
      view = <Splash onNext={() => go('onboarding1')} />;
  }

  const containerStyle = useMemo(() => ({
    width: '100%',
    minHeight: '100dvh',
    maxWidth: 480,
    margin: '0 auto',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflowX: 'hidden',
  }), []);

  return (
    <div style={containerStyle}>
      <div
        key={stage}
        className="page-enter"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, width: '100%' }}
      >
        {view}
      </div>
    </div>
  );
}
