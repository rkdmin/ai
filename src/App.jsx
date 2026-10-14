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
import {
  MAIN_TABS,
  detailRoute,
  flowRoute,
  isRequestRoute,
  mainRoute,
  resolveBackRoute,
  routeForScreen,
  routeKey,
  routeScreen,
  sheetRoute,
  transitionNavigation,
} from './utils/navigation';
import { createRequestGate, isStaleRequestError } from './utils/requestGate';

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


export default function App() {
  const auth = useAuth();
  const [appState, setAppState] = useState({ route: flowRoute('splash'), result: null });
  const { route, result } = appState;
  const [photo, setPhoto] = useState(null);
  const [personalColor, setPersonalColor] = useState(null);
  const [hairCards, setHairCards] = useState(null);
  const [makeupCards, setMakeupCards] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [adReturn, setAdReturn] = useState({ done: 'card_detail', originRoute: null });
  const [synthByKey, setSynthByKey] = useState({});
  const [errorInfo, setErrorInfo] = useState({ type: 'face', message: '' });
  const [guestGateReason, setGuestGateReason] = useState('history');
  const [historySelection, setHistorySelection] = useState({ analysisId: null });
  const taskRef = useRef(null);
  const requestGateRef = useRef(createRequestGate());
  const activeRequestIdRef = useRef(null);
  const routeRef = useRef(route);

  useEffect(() => { routeRef.current = route; }, [route]);

  const setResult = useCallback((nextResult) => {
    setAppState((current) => ({ ...current, result: nextResult }));
  }, []);

  const cancelActiveRequest = useCallback(() => {
    requestGateRef.current.cancel(activeRequestIdRef.current);
    activeRequestIdRef.current = null;
    taskRef.current = null;
  }, []);

  const beginRequest = useCallback((promise) => {
    const request = requestGateRef.current.run(promise);
    activeRequestIdRef.current = request.id;
    taskRef.current = request.task;
    return request.id;
  }, []);

  const setRoute = useCallback((nextRoute, historyMode = 'push') => {
    const current = routeRef.current;
    if (isRequestRoute(current) && routeKey(current) !== routeKey(nextRoute)) cancelActiveRequest();
    routeRef.current = nextRoute;
    setAppState((state) => transitionNavigation(state, nextRoute));
    if (typeof window === 'undefined') return;
    try {
      const method = historyMode === 'replace' ? 'replaceState' : 'pushState';
      window.history[method]({ route: nextRoute }, '', '');
    } catch { /* noop */ }
  }, [cancelActiveRequest]);

  const go = useCallback((next) => {
    const nextRoute = typeof next === 'string' ? routeForScreen(next, routeRef.current) : next;
    setRoute(nextRoute);
  }, [setRoute]);

  const back = useCallback(() => {
    const parent = resolveBackRoute(routeRef.current);
    if (!parent) return;
    setRoute(parent, 'replace');
  }, [setRoute]);

  const openGuestGate = useCallback((reason, target) => {
    setGuestGateReason(reason);
    setPostAuthTarget(target);
    go(sheetRoute('guest_gate', routeRef.current));
  }, [go]);

  const openHistory = useCallback(() => {
    if (!auth.isAuthenticated) {
      openGuestGate('history', { kind: 'detail', screen: 'history' });
      return;
    }
    go(detailRoute('history', routeRef.current));
  }, [auth.isAuthenticated, go, openGuestGate]);

  const openHistoryDetail = useCallback((analysisId) => {
    if (!analysisId) return;
    if (!auth.isAuthenticated) {
      openGuestGate('history_detail', { kind: 'history_detail', analysisId });
      return;
    }
    setHistorySelection({ analysisId });
    go(detailRoute('history_detail', routeRef.current));
  }, [auth.isAuthenticated, go, openGuestGate]);

  const navTab = useCallback((tab) => {
    if (!MAIN_TABS.includes(tab)) return;
    go(mainRoute(tab));
  }, [go]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    try { window.history.replaceState({ route: flowRoute('splash') }, '', ''); } catch { /* noop */ }

    const onPop = () => {
      const parent = resolveBackRoute(routeRef.current);
      if (!parent) {
        try { window.history.pushState({ route: routeRef.current }, '', ''); } catch { /* noop */ }
        return;
      }
      setRoute(parent, 'replace');
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
  }, [setRoute]);

  useEffect(() => {
    if (!auth.isAuthenticated) return;
    const target = consumePostAuthTarget();
    if (!target) return;
    if (target.kind === 'tab' && target.stage) {
      go(mainRoute(target.stage));
      return;
    }
    if (target.kind === 'detail' && target.screen === 'history') {
      go(detailRoute('history', mainRoute('home')));
      return;
    }
    if (target.kind === 'history_detail' && target.analysisId) {
      setHistorySelection({ analysisId: target.analysisId });
      go(detailRoute('history_detail', detailRoute('history', mainRoute('home'))));
    }
  }, [auth.isAuthenticated, go]);

  const startAnalysis = useCallback(() => {
    if (!photo?.dataUrl) {
      setErrorInfo({ type: 'face', message: '사진이 준비되지 않았어요.' });
      go('error_face');
      return;
    }
    beginRequest(analyzeFace(photo.dataUrl, backendPersonalColorKey(personalColor)));
    go('loading');
  }, [photo, personalColor, beginRequest, go]);

  const onAnalysisSuccess = useCallback((r) => {
    if (!r || r.faceType === '판정 어려움') {
      setErrorInfo({ type: 'face', message: '얼굴 윤곽이 잘 보이는 정면 사진으로 다시 시도해 주세요.' });
      go('error_face');
      return;
    }
    setResult({ ...r, personalColor: r.personalColor || personalColor });
    setHairCards(null);
    setMakeupCards(null);
    setActiveCard(null);
    setSynthByKey({});
    go('result_home');
  }, [personalColor, go, setResult]);

  const onAnalysisError = useCallback((e) => {
    if (isStaleRequestError(e)) return;
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
    beginRequest(fn(payload).then((arr) =>
      mapCards(arr, type, { result, features: result.features }).map((card) => ({
        ...card,
        analysisId: result.analysisId ?? null,
      })),
    ));
    go(type === 'makeup' ? 'makeup_loading' : 'hair_loading');
  }, [result, beginRequest, go]);

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
    if (isStaleRequestError(e)) return;
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
      beginRequest(Promise.resolve(cached));
    } else {
      beginRequest(generateStyledPhoto(photo?.dataUrl || null, card));
    }
    setAdReturn({ done: 'synth_loading', originRoute: routeRef.current });
    go('ad_gate');
  }, [photo, synthByKey, beginRequest, go]);

  const onSynthSuccess = useCallback((dataUrl) => {
    if (!activeCard || !dataUrl) {
      go(adReturn.originRoute || detailRoute('card_detail'));
      return;
    }
    const key = cardKey(activeCard);
    setSynthByKey((m) => (m[key] === dataUrl ? m : { ...m, [key]: dataUrl }));
    go(adReturn.originRoute || detailRoute('card_detail'));
  }, [activeCard, adReturn.originRoute, go]);

  const onSynthError = useCallback((e) => {
    if (isStaleRequestError(e)) return;
    const msg = String(e?.message || e || '');
    setErrorInfo({ type: 'network', message: msg });
    go(adReturn.originRoute || detailRoute('card_detail'));
  }, [adReturn.originRoute, go]);

  const photoUrl = photo?.dataUrl || result?.frontImageUrl || null;

  const screen = routeScreen(route);
  let view;
  switch (screen) {
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
          onBack={back}
          mode="guest_gate"
          reason={guestGateReason}
        />
      );
      break;
    case 'home':
      view = <Home onNext={() => go('upload')} onNav={(target) => target === 'history' ? openHistory() : navTab(target)} onOpenRecent={openHistoryDetail} canAccessHistory={auth.isAuthenticated} />;
      break;
    case 'upload':
      view = (
        <PhotoUpload
          onUpload={(file, dataUrl) => {
            setPhoto({ file, dataUrl });
            go('personal_color');
          }}
          onBack={back}
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
          onBack={back}
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
          onCancel={back}
        />
      );
      break;
    case 'error_face':
      view = (
        <ErrorScreen
          type="face"
          message={errorInfo.message}
          onRetry={() => go('upload')}
          onBack={back}
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
          onBack={back}
        />
      );
      break;
    case 'result_home':
      view = (
        <AnalysisResult
          result={result}
          photoUrl={photoUrl}
          onBack={back}
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
          onCancel={back}
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
              setAdReturn({ done: 'card_detail', originRoute: routeRef.current });
              go('ad_gate');
            } else {
              go('card_detail');
            }
          }}
          onBack={back}
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
          onBack={back}
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
          onCancel={() => go(adReturn.originRoute || detailRoute('card_detail'))}
        />
      );
      break;
    case 'ad_gate':
      view = (
        <AdGate
          card={activeCard}
          onDone={() => adReturn.done === 'synth_loading'
            ? go('synth_loading')
            : go(detailRoute(adReturn.done, adReturn.originRoute || mainRoute('home')))}
          onBack={back}
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
          onClose={back}
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
          onCancel={back}
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
              setAdReturn({ done: 'makeup_detail', originRoute: routeRef.current });
              go('ad_gate');
            } else {
              go('makeup_detail');
            }
          }}
          onBack={back}
        />
      );
      break;
    case 'makeup_detail':
      view = (
        <MakeupDetail
          card={activeCard}
          result={result}
          photoUrl={photoUrl}
          onBack={back}
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
          onClose={back}
        />
      );
      break;
    case 'style':
      view = <Trend section="style" onNav={navTab} />;
      break;
    case 'chemistry':
      view = <Trend section="chemistry" onNav={navTab} />;
      break;
    case 'history':
      view = <History onBack={back} onOpenDetail={openHistoryDetail} onNewAnalysis={() => go('upload')} />;
      break;
    case 'history_detail':
      view = (
        <HistoryDetail
          analysisId={historySelection.analysisId}
          onBack={back}
          onNewAnalysis={() => go('upload')}
          onOpenCards={(type, cards, analysis) => {
            setResult(analysis);
            setActiveCard(null);
            setSynthByKey({});
            if (type === 'makeup') {
              setHairCards(null);
              setMakeupCards(cards);
              go(detailRoute('result_tabs_makeup', routeRef.current));
              return;
            }
            setMakeupCards(null);
            setHairCards(cards);
            go(detailRoute('result_tabs_hair', routeRef.current));
          }}
        />
      );
      break;
    case 'my':
      view = <My onNav={(target) => target === 'history' ? openHistory() : navTab(target)} onBack={back} onSignOut={() => { auth.signOut(); go('login'); }} />;
      break;
    default:
      view = <Splash onNext={() => go('onboarding1')} />;
  }

  const containerStyle = useMemo(() => ({
    width: '100%',
    minHeight: '100dvh',
    maxWidth: 430,
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
        key={routeKey(route)}
        className="page-enter"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, width: '100%' }}
      >
        {view}
      </div>
    </div>
  );
}
