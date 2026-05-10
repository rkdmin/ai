import { useCallback, useMemo, useRef, useState } from 'react';
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

import { analyzeFace, generateHairCards, generateMakeupCards } from './api/ai';
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

  // 분석 / 네트워크 에러 표시용.
  const [errorInfo, setErrorInfo] = useState({ type: 'face', message: '' });

  const go = useCallback((next) => setStage(next), []);
  const navTab = useCallback((tab) => {
    const allowed = ['home', 'trend', 'history', 'my'];
    if (allowed.includes(tab)) go(tab);
  }, [go]);

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
          onBack={() => go('result_tabs_hair')}
          onShare={() => go('share_card')}
          onSynthesize={() => {
            setAdReturn({ done: 'card_detail', back: 'card_detail' });
            go('ad_gate');
          }}
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
