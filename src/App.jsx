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
import My from './components/My';

import { analyzeFace, generateHairCards, generateMakeupCards, generateStyledPhoto } from './api/ai';
import { mapCards } from './api/mappers';

/**
 * 25 화면 흐름. 사용자 액션이 분석 / 카드 생성 / 사진 합성 같은 비동기 작업을 트리거할 때마다
 * promise 를 만들어 다음 Loading 화면으로 넘긴다. Loading 컴포넌트는 promise 를 받아
 * 단계 애니메이션을 돌리다가 결과/에러로 onSuccess/onError 호출.
 *
 * 백엔드 응답이 'faceType: 판정 어려움' 이면 error_face 화면으로, fetch 실패면 error_network 로 라우팅.
 *
 * 카드 잠금은 v1.0 에서는 모두 무료(mappers 가 locked=false 로 정규화). v1.1 광고 게이트는 별도 정책 토글.
 */

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

// 카드별 합성 결과 캐시 키. 같은 분석 안에서 카드의 cardType+rank+이름으로 식별.
// (분석이 새로 실행되면 hairCards/makeupCards 가 갈리고, 같은 카드여도 새 키로 인식되므로
// 굳이 분석 id 까지 묶지 않아도 충돌 위험 없음.)
function cardKey(card) {
  if (!card) return '';
  return `${card.cardType || 'hair'}-${card.rank ?? 0}-${card.name || card.hair || card.mood || ''}`;
}

// stage 별 "뒤로가기" 시 돌아갈 부모 stage. Android 하드웨어 백 + 데스크톱 브라우저 백 처리용.
// 분기 로직(예: card_detail 은 hair / makeup 둘 다에서 진입)은 navStackRef 에서 stage 진입 순서를 보고 결정.
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
  my: 'home',
};

export default function App() {
  const [stage, setStage] = useState('splash');

  // 입력
  const [photo, setPhoto] = useState(null); // { file, dataUrl }
  const [personalColor, setPersonalColor] = useState(null); // 한국어 라벨 (예: '봄 웜톤')

  // 분석 결과 / 카드 / 활성 카드
  const [result, setResult] = useState(null);
  const [hairCards, setHairCards] = useState(null);
  const [makeupCards, setMakeupCards] = useState(null);
  const [activeCard, setActiveCard] = useState(null);

  // 비동기 작업 promise — Loading 화면이 받아 진행 / 결과 처리.
  const taskRef = useRef(null);

  // 광고 게이트 진입 시 어떤 stage 로 돌아갈지 / 완료 후 어디로 갈지.
  const [adReturn, setAdReturn] = useState({ done: 'card_detail', back: 'result_tabs_hair' });

  // 카드별 합성 사진 캐시. key 는 cardKey() 결과(헤어/메이크업 + rank + 이름).
  // 한 번 합성하면 같은 카드를 다시 열어도 같은 이미지 사용.
  const [synthByKey, setSynthByKey] = useState({});

  // 분석 / 네트워크 에러 표시용.
  const [errorInfo, setErrorInfo] = useState({ type: 'face', message: '' });

  // history stack 동기화. 새 stage 마다 pushState — 사용자가 시스템 백을 누르면 popstate 가 떨어지고
  // 거기서 부모 stage 로 되돌린다. setStage 자체는 popstate 핸들러에서도 호출되므로,
  // pushState 는 "유저 액션으로 넘어갈 때만" 일어나도록 isPopRef 로 가드.
  const isPopRef = useRef(false);
  const go = useCallback((next) => {
    setStage(next);
    if (typeof window === 'undefined') return;
    if (isPopRef.current) {
      // popstate 콜백 안에서 setStage 한 케이스 — history 는 이미 한 칸 뒤로 갔음.
      isPopRef.current = false;
      return;
    }
    try { window.history.pushState({ stage: next }, '', ''); } catch { /* noop */ }
  }, []);
  const navTab = useCallback((tab) => {
    const allowed = ['home', 'trend', 'history', 'my'];
    if (allowed.includes(tab)) go(tab);
  }, [go]);

  // 진입 시 1번만: 첫 history 항목 심기 + popstate / Capacitor backButton 리스너.
  // stageRef 로 클로저에서 최신 stage 를 본다.
  const stageRef = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    try { window.history.replaceState({ stage: 'splash' }, '', ''); } catch { /* noop */ }

    const onPop = () => {
      const cur = stageRef.current;
      const parent = PARENT_STAGE[cur];
      if (!parent) {
        // home / splash 등 루트에서 백 → 다시 한 칸 push 해서 앱이 종료되지 않도록 보존.
        // (Capacitor 환경에서는 별도로 App.exitApp 을 호출해도 되지만, 웹/PWA 호환을 위해 보수적으로 유지.)
        try { window.history.pushState({ stage: cur }, '', ''); } catch { /* noop */ }
        return;
      }
      isPopRef.current = true;
      setStage(parent);
    };
    window.addEventListener('popstate', onPop);

    // Capacitor 네이티브 빌드: 하드웨어 백 버튼은 popstate 가 자동으로 발화되지 않을 수 있어
    // App 플러그인 backButton 이벤트도 같이 후킹. 미설치 환경에서는 import 가 실패하지만
    // try/catch 로 폴백되므로 빌드/실행에 영향 없음.
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

  const startAnalysis = useCallback(() => {
    if (!photo?.dataUrl) {
      setErrorInfo({ type: 'face', message: '사진이 준비되지 않았어요.' });
      go('error_face');
      return;
    }
    taskRef.current = analyzeFace(photo.dataUrl);
    go('loading');
  }, [photo, go]);

  const onAnalysisSuccess = useCallback((r) => {
    if (!r || r.faceType === '판정 어려움') {
      setErrorInfo({ type: 'face', message: '여러 얼굴형 특징이 섞여 있어요. 정면 사진을 다시 올려보세요.' });
      go('error_face');
      return;
    }
    setResult({ ...r, personalColor: r.personalColor || personalColor });
    setHairCards(null);
    setMakeupCards(null);
    setActiveCard(null);
    setSynthByKey({}); // 이전 분석의 합성 사진 캐시 폐기.
    go('result_home');
  }, [personalColor, go]);

  const onAnalysisError = useCallback((e) => {
    const msg = String(e?.message || e || '');
    const isNet = /연결|네트워크|fetch|Network|timeout/i.test(msg);
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
      mapCards(arr, type, { result, features: result.features }),
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

  // ── 사진 합성 (POST /api/photo/generate) ──────────────────────
  const startSynthesis = useCallback((card) => {
    if (!photo?.dataUrl || !card) return;
    if (card.cardType === 'makeup') return; // 정책: 메이크업 카드는 합성 미지원.
    const key = cardKey(card);
    // 이미 받아둔 합성 결과가 있으면 재호출 안 함 — 광고만 다시 보여주고 끝.
    const cached = synthByKey[key];
    if (cached) {
      taskRef.current = Promise.resolve(cached);
    } else {
      taskRef.current = generateStyledPhoto(photo.dataUrl, card);
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
    // 합성 실패는 분석/카드 에러처럼 전역 에러 화면으로 던지지 않고, 카드 상세로 돌아가
    // AFTER 슬롯의 안내 텍스트로 노출. 사용자가 다른 카드를 보거나 재시도할 수 있게.
    setErrorInfo({ type: 'network', message: msg });
    go('card_detail');
  }, [go]);

  const photoUrl = photo?.dataUrl || null;

  let view;
  switch (stage) {
    // ── A · ONBOARDING ─────────────────────────────────────
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
      view = <Login onNext={() => { markOnboarded(); go('home'); }} />;
      break;
    case 'guest_gate':
      view = <Login onNext={() => { markOnboarded(); go('home'); }} mode="guest_gate" />;
      break;

    // ── B · ANALYZE ────────────────────────────────────────
    case 'home':
      view = <Home onNext={() => go('upload')} onNav={navTab} />;
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
            // 마지막 작업이 분석이었는지 카드 생성이었는지에 따라 재시도.
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

    // ── C · RESULT (HAIR) ──────────────────────────────────
    case 'result_home':
      view = (
        <AnalysisResult
          result={result}
          photoUrl={photoUrl}
          onCardList={(type) => {
            // 이미 받아둔 카드가 있으면 재호출 안 함.
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
            { label: '레퍼런스 검색', en: 'REFERENCE' },
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
          onClose={() => go(activeCard ? 'card_detail' : 'result_home')}
        />
      );
      break;

    // ── D · MAKEUP ─────────────────────────────────────────
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

    // ── E · DISCOVER ───────────────────────────────────────
    case 'trend':
      view = <Trend onNav={navTab} />;
      break;
    case 'history':
      view = <History onNav={navTab} onBack={() => go('home')} />;
      break;
    case 'my':
      view = <My onNav={navTab} onBack={() => go('home')} />;
      break;

    default:
      view = <Splash onNext={() => go('onboarding1')} />;
  }

  // 데스크톱(≥600px) 에서는 480px 캡 모바일 프레임. 모바일에서는 화면 전체.
  // 100dvh 로 모바일 브라우저 chrome 변동 대응. 데스크톱 베이지 백드롭은 globals.css.
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

  // 내부 wrapper 에 key={stage} 를 주면 stage 전환 시 .page-enter 애니메이션이
  // 매번 재실행되어 화면이 살짝 떠오르며 페이드 인 — "탭 사이 점프" 느낌 제거.
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
