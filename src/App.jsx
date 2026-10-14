import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles/tokens.css';
import './styles/globals.css';

import Splash from './components/Splash';
import Login from './components/Login';
import Home from './components/Home';
import PhotoUpload from './components/PhotoUpload';
import Loading from './components/Loading';
import ErrorScreen from './components/ErrorScreen';
import AnalysisResult from './components/AnalysisResult';
import CardList from './components/CardList';
import CardDetail from './components/CardDetail';
import MakeupDetail from './components/MakeupDetail';
import ShareCard from './components/ShareCard';
import Trend from './components/Trend';
import History from './components/History';
import HistoryDetail from './components/HistoryDetail';
import My from './components/My';
import Report from './components/Report';
import ReportHairDetail from './components/ReportHairDetail';
import ReportMakeupDetail from './components/ReportMakeupDetail';

import { analyzeFace, createReport, fetchHistory, fetchHistoryDetail, generateStyledPhoto, retryReport } from './api/ai';
import { useAuth } from './contexts/AuthContext';
import { consumePostAuthTarget, setPostAuthTarget } from './utils/authBridge';
import {
  MAIN_TABS,
  analysisRoute,
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
import { loadLatestAnalysis, profileOwnerForSession, saveLatestAnalysis } from './utils/profileStorage';
import { classifyAnalysisError } from './utils/analysisErrors';

function cardKey(card) {
  if (!card) return '';
  return `${card.cardType || 'hair'}-${card.rank ?? 0}-${card.name || card.hair || card.mood || ''}`;
}


export default function App() {
  const auth = useAuth();
  const [appState, setAppState] = useState({ route: flowRoute('splash'), result: null });
  const { route, result } = appState;
  const [photo, setPhoto] = useState(null);
  const [hairCards, setHairCards] = useState(null);
  const [makeupCards, setMakeupCards] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  // 통합 Beauty Report (F04) — 한 리포트에 HAIR/MAKEUP 탭. 상세는 styles[n]/looks[n] 하나.
  const [report, setReport] = useState(null);
  const [reportTab, setReportTab] = useState('hair');
  const [activeStyle, setActiveStyle] = useState(null);
  const [activeLook, setActiveLook] = useState(null);
  const [synthByKey, setSynthByKey] = useState({});
  const [errorInfo, setErrorInfo] = useState({ type: 'face', code: null, message: '' });
  const [guestGateReason, setGuestGateReason] = useState('history');
  const [historySelection, setHistorySelection] = useState({ analysisId: null });
  const taskRef = useRef(null);
  const requestGateRef = useRef(createRequestGate());
  const activeRequestIdRef = useRef(null);
  const routeRef = useRef(route);
  const synthOriginRef = useRef(null); // TRY ON 을 연 상세 route — 합성 끝나면 여기로 돌아간다 (광고 게이트 없음, ADR 0010)
  const profileLoadIdRef = useRef(0);
  const profileOwner = useMemo(() => profileOwnerForSession(auth.session), [auth.session]);

  useEffect(() => { routeRef.current = route; }, [route]);

  const setResult = useCallback((nextResult) => {
    setAppState((current) => ({ ...current, result: nextResult }));
  }, []);

  useEffect(() => {
    const loadId = ++profileLoadIdRef.current;
    setResult(null);

    if (!auth.isAuthenticated) {
      setResult(loadLatestAnalysis(profileOwner));
      return undefined;
    }

    let alive = true;
    const restore = async () => {
      try {
        const rows = await fetchHistory(1);
        const latestId = Array.isArray(rows) ? rows[0]?.analysisId : null;
        if (latestId) {
          const detail = await fetchHistoryDetail(latestId);
          if (alive && loadId === profileLoadIdRef.current && detail?.analysis) {
            const clean = saveLatestAnalysis(profileOwner, detail.analysis);
            setResult(clean);
            return;
          }
        }
      } catch { /* 기기 저장본으로 폴백 */ }

      if (alive && loadId === profileLoadIdRef.current) {
        setResult(loadLatestAnalysis(profileOwner));
      }
    };
    restore();
    return () => { alive = false; };
  }, [auth.isAuthenticated, profileOwner, setResult]);

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

  // 사진 확인 직후 바로 분석한다. 퍼스널컬러 선택 단계는 Figma 핵심 흐름에 없어 뺐다 (ADR 0010 R13) —
  // 백엔드는 personalColor 가 없으면 색 대신 질감·위치 위주로 추천한다. 보조 입력으로 되살리기 전까지 null.
  const startAnalysis = useCallback((dataUrl = photo?.dataUrl) => {
    if (!dataUrl) {
      setErrorInfo({ type: 'face', code: 'INVALID_IMAGE', message: '사진이 준비되지 않았어요.' });
      go('error_face');
      return;
    }
    beginRequest(analyzeFace(dataUrl, null));
    go('loading');
  }, [photo, beginRequest, go]);

  const onAnalysisSuccess = useCallback((r) => {
    if (!r || r.faceType === '판정 어려움') {
      setErrorInfo({ type: 'face', code: 'NO_FACE', message: '얼굴 윤곽이 잘 보이는 정면 사진으로 다시 시도해 주세요.' });
      go('error_face');
      return;
    }
    const nextResult = { ...r, personalColor: r.personalColor || null };
    setResult(nextResult);
    saveLatestAnalysis(profileOwner, nextResult);
    setHairCards(null);
    setMakeupCards(null);
    setActiveCard(null);
    setSynthByKey({});
    go('result_home');
  }, [go, profileOwner, setResult]);

  const onAnalysisError = useCallback((e) => {
    if (isStaleRequestError(e)) return;
    const msg = String(e?.message || e || '');
    const type = classifyAnalysisError(e);
    setErrorInfo({ type, code: e?.code || null, message: msg });
    go(type === 'network' ? 'error_network' : 'error_face');
  }, [go]);

  // ── 통합 Beauty Report (F04) ─────────────────────────────────────
  // 무료 결과의 "전체 Beauty Report 보기" → 생성(멱등) → HAIR 탭. 결제(P4)·결제 전 로그인(R02)은 아직 없어
  // 백엔드 REPORT_ACCESS_MODE 가 권한을 정한다. 구 카드 4장 흐름은 MY 기록에서 저장 카드를 다시 열 때만 쓴다.
  const startReport = useCallback(() => {
    if (!result) return;
    setReportTab('hair');
    beginRequest(createReport(result.analysisId ?? null));
    go('report_loading');
  }, [result, beginRequest, go]);

  const onReportSuccess = useCallback((r) => {
    if (!r) {
      go('result_home');
      return;
    }
    setReport(r);
    go(detailRoute('report', analysisRoute('result_home')));
  }, [go]);

  const onReportError = useCallback((e) => {
    if (isStaleRequestError(e)) return;
    const msg = String(e?.message || e || '');
    setErrorInfo({ type: 'network', code: e?.code || null, message: msg });
    go('error_network');
  }, [go]);

  const retryReportNow = useCallback(() => {
    if (!report?.id) return;
    beginRequest(retryReport(report.id));
    go('report_loading');
  }, [report, beginRequest, go]);

  const openStyle = useCallback((style) => {
    setActiveStyle(style);
    // TRY ON 캐시 키(cardKey)와 공유 카드가 쓰는 모양으로 맞춘다. reportId 로 리포트 권한을 함께 보낸다 (F06).
    setActiveCard({ ...style, cardType: 'hair', name: style.hair, analysisId: report?.analysisId ?? result?.analysisId ?? null, reportId: report?.id ?? null });
    go(detailRoute('report_hair_detail', routeRef.current));
  }, [report, result, go]);

  const openLook = useCallback((look) => {
    setActiveLook(look);
    setActiveCard({ ...look, cardType: 'makeup', name: look.mood, analysisId: report?.analysisId ?? result?.analysisId ?? null });
    go(detailRoute('report_makeup_detail', routeRef.current));
  }, [report, result, go]);

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
    synthOriginRef.current = routeRef.current;
    go('synth_loading');
  }, [photo, synthByKey, beginRequest, go]);

  const onSynthSuccess = useCallback((dataUrl) => {
    if (!activeCard || !dataUrl) {
      go(synthOriginRef.current || detailRoute('card_detail'));
      return;
    }
    const key = cardKey(activeCard);
    setSynthByKey((m) => (m[key] === dataUrl ? m : { ...m, [key]: dataUrl }));
    go(synthOriginRef.current || detailRoute('card_detail'));
  }, [activeCard, go]);

  const onSynthError = useCallback((e) => {
    if (isStaleRequestError(e)) return;
    const msg = String(e?.message || e || '');
    setErrorInfo({ type: 'network', message: msg });
    go(synthOriginRef.current || detailRoute('card_detail'));
  }, [go]);

  const photoUrl = photo?.dataUrl || result?.frontImageUrl || null;

  const screen = routeScreen(route);
  let view;
  switch (screen) {
    case 'splash':
      view = <Splash onNext={() => go('home')} />;
      break;
    // 온보딩 3장·독립 로그인 화면은 Figma 에 없어 뺐다 (Guest-first, ADR 0010). 스플래시 → 홈.
    // 계정 연결은 guest_gate 시트(Figma 112:1017 "계정 연결") 하나로 받는다.
    case 'guest_gate':
      view = (
        <Login
          onNext={() => go('home')}
          onOAuth={(provider) => auth.signIn(provider)}
          onGuest={() => { auth.continueAsGuest(); go('home'); }}
          onTestLogin={() => { auth.signInAsTestUser(); go('home'); }}
          onBack={back}
          mode="guest_gate"
          reason={guestGateReason}
        />
      );
      break;
    case 'home':
      view = <Home profile={result} onNext={() => go('upload')} onNav={(target) => target === 'history' ? openHistory() : navTab(target)} onOpenRecent={openHistoryDetail} canAccessHistory={auth.isAuthenticated} />;
      break;
    case 'upload':
      view = (
        <PhotoUpload
          onUpload={(file, dataUrl) => {
            setPhoto({ file, dataUrl });
            startAnalysis(dataUrl);
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
          code={errorInfo.code}
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
          code={errorInfo.code}
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
          onReport={startReport}
          onShare={() => {
            setActiveCard(null);
            go('share_card');
          }}
        />
      );
      break;
    case 'report_loading':
      view = (
        <Loading
          task={taskRef.current}
          photoUrl={photoUrl}
          label="Beauty Report"
          steps={[
            { label: '헤어 방향 정리', en: 'HAIR' },
            { label: '메이크업 방향 정리', en: 'MAKEUP' },
            { label: '미용실 가이드 작성', en: 'SALON GUIDE' },
          ]}
          onSuccess={onReportSuccess}
          onError={onReportError}
          onCancel={back}
        />
      );
      break;
    case 'report':
      view = (
        <Report
          report={report}
          tab={reportTab}
          onTab={setReportTab}
          onBack={back}
          onShare={() => { setActiveCard(null); go('share_card'); }}
          onOpenStyle={openStyle}
          onOpenLook={openLook}
          onRetry={retryReportNow}
          onUnlock={startReport}
        />
      );
      break;
    case 'report_hair_detail':
      view = (
        <ReportHairDetail
          style={activeStyle}
          analysis={report?.analysis}
          photoUrl={photoUrl}
          synthesizedPhoto={activeCard ? synthByKey[cardKey(activeCard)] : null}
          canTryOn={Boolean(photoUrl || activeCard?.analysisId)}
          onBack={back}
          onShare={() => go('share_card')}
          onTryOn={() => startSynthesis(activeCard)}
        />
      );
      break;
    case 'report_makeup_detail':
      view = (
        <ReportMakeupDetail
          look={activeLook}
          analysis={report?.analysis}
          onBack={back}
          onShare={() => go('share_card_makeup')}
        />
      );
      break;
    // ── 아래 카드 4장 화면(result_tabs_*·card_detail·makeup_detail)은 MY 기록의 저장 카드 재열람 전용이다.
    // 새 분석 흐름은 리포트로 간다. MY 기록 화면을 Figma 모양으로 다시 만들 때 함께 정리한다.
    case 'result_tabs_hair':
      view = (
        <CardList
          type="hair"
          cards={hairCards}
          onCard={(card) => {
            setActiveCard(card);
            go('card_detail'); // 광고 잠금 없음 — 모든 카드가 바로 열린다 (ADR 0010)
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
          onCancel={() => go(synthOriginRef.current || detailRoute('card_detail'))}
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
    case 'result_tabs_makeup':
      view = (
        <CardList
          type="makeup"
          cards={makeupCards}
          onCard={(card) => {
            setActiveCard(card);
            go('makeup_detail');
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
      view = <My profile={result} onNav={(target) => target === 'history' ? openHistory() : target === 'login' ? openGuestGate('my', mainRoute('my')) : navTab(target)} onBack={back} onSignOut={() => { auth.signOut(); go('home'); }} />;
      break;
    default:
      view = <Splash onNext={() => go('home')} />;
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
