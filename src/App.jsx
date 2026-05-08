import { useState } from 'react';
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

// Stage 흐름은 Beaumi Hi-Fi 와이어프레임 25개 화면 순서를 그대로 따른다.
// 기능이 붙어있는 화면(upload·loading·result·card list·card detail·ad gate·share)은
// 실제 사진/분석 결과/카드 데이터를 들고 다니고,
// 아직 백엔드 연결이 없는 화면(splash·onboarding·login·home·personal_color·error·trend·history·my)은
// 단순히 다음 stage 로 진행한다 — 각 컴포넌트에 // TODO 주석 표시.

export default function App() {
  const [stage, setStage] = useState('splash');

  // 기능 상태 — 화면 간에 들고 다님.
  const [photo, setPhoto] = useState(null);                // { file, dataUrl }
  const [, setPersonalColor] = useState(null);             // 'spring' | 'summer' | ...
  const [result, setResult] = useState(null);              // { faceType, features, moodArchetype, ... }
  const [cardListType, setCardListType] = useState('hair'); // 'hair' | 'makeup'
  const [activeCard, setActiveCard] = useState(null);

  // 광고 게이트 진입 시 어떤 stage 로 돌아갈지 / 완료 후 어디로 갈지 저장.
  const [adReturn, setAdReturn] = useState({ done: 'card_detail', back: 'result_tabs_hair' });

  function go(next) {
    setStage(next);
  }
  function navTab(tab) {
    const map = { home: 'home', trend: 'trend', history: 'history', my: 'my' };
    if (map[tab]) go(map[tab]);
  }

  // 분석 완료 — Loading 화면이 끝나면 호출됨.
  // TODO: Claude Code — 아래 mock 을 실제 호출로 교체.
  //   const r = await apiClient.analyze(photo.file);
  //   setResult(r);
  function onAnalysisDone() {
    setResult({
      faceType: '계란형',
      personalColor: '봄 웜톤',
      features: ['균형잡힌 비율', '입체적인 골격', '부드러운 눈매'],
      moodArchetype: ['ROMANTIC', 'CLEAN', 'SOFT'],
      styleLabel: '봄날의 햇살형',
    });
    go('result_home');
  }

  let view;
  switch (stage) {
    // ── A · ONBOARDING ─────────────────────────────────────
    case 'splash':
      view = <Splash onNext={() => go('onboarding1')} />;
      break;
    case 'onboarding1':
      view = <Onboarding idx={0} onNext={() => go('onboarding2')} onSkip={() => go('login')} />;
      break;
    case 'onboarding2':
      view = <Onboarding idx={1} onNext={() => go('onboarding3')} onSkip={() => go('login')} />;
      break;
    case 'onboarding3':
      view = <Onboarding idx={2} onNext={() => go('login')} />;
      break;
    case 'login':
      view = <Login onNext={() => go('home')} />;
      break;
    case 'guest_gate':
      view = <Login onNext={() => go('home')} mode="guest_gate" />;
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
            setPersonalColor(pick);
            go('loading');
          }}
          onBack={() => go('upload')}
        />
      );
      break;
    case 'loading':
      view = <Loading onNext={onAnalysisDone} onCancel={() => go('home')} />;
      break;
    case 'error_face':
      // TODO: 분석 응답이 faceType:'판정 어려움' 또는 422 일 때 자동 진입.
      view = <ErrorScreen type="face" onRetry={() => go('upload')} onBack={() => go('home')} />;
      break;
    case 'error_network':
      // TODO: fetch 실패 / timeout 시 자동 진입.
      view = <ErrorScreen type="network" onRetry={() => go('loading')} onBack={() => go('home')} />;
      break;

    // ── C · RESULT (HAIR) ──────────────────────────────────
    case 'result_home':
      view = (
        <AnalysisResult
          result={result}
          onCardList={(type) => {
            setCardListType(type);
            setActiveCard(null);
            go(type === 'makeup' ? 'makeup_loading' : 'hair_loading');
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
          onNext={() => go('result_tabs_hair')}
          onCancel={() => go('result_home')}
          label="헤어 추천"
          steps={[
            { label: '얼굴형 매칭', en: 'SHAPE MATCH' },
            { label: '레퍼런스 검색', en: 'REFERENCE' },
            { label: '카드 큐레이션', en: 'CURATION' },
          ]}
        />
      );
      break;
    case 'result_tabs_hair':
      view = (
        <CardList
          type="hair"
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
          onBack={() => go('result_tabs_hair')}
          onShare={() => go('share_card')}
          onSynthesize={() => {
            // TODO: 합성 광고 시청 후 POST /api/photo/generate (로그인 전용) 호출.
            setAdReturn({ done: 'card_detail', back: 'card_detail' });
            go('ad_gate');
          }}
        />
      );
      break;
    case 'ad_gate':
      view = <AdGate onDone={() => go(adReturn.done)} onBack={() => go(adReturn.back)} />;
      break;
    case 'share_card':
      view = (
        <ShareCard
          variant="hair"
          result={result}
          card={activeCard}
          onClose={() => go(activeCard ? 'card_detail' : 'result_home')}
          onSave={() => {
            // TODO: html2canvas → blob → download / Web Share API.
          }}
          onCopy={() => {
            // TODO: navigator.clipboard.writeText(공유 링크).
          }}
        />
      );
      break;

    // ── D · MAKEUP ─────────────────────────────────────────
    case 'makeup_loading':
      view = (
        <Loading
          onNext={() => go('result_tabs_makeup')}
          onCancel={() => go('result_home')}
          label="메이크업 추천"
          steps={[
            { label: '얼굴 특징 분석', en: 'FEATURES' },
            { label: '컬러 팔레트', en: 'PALETTE' },
            { label: '파트별 가이드', en: 'GUIDE' },
          ]}
        />
      );
      break;
    case 'result_tabs_makeup':
      view = (
        <CardList
          type="makeup"
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
          onBack={() => go('result_tabs_makeup')}
          onShare={() => go('share_card_makeup')}
          onSynthesize={() => {
            // 메이크업 카드는 합성 미지원 정책. 추가 추천 제품 더보기로 대체.
            // TODO: 쿠팡파트너스 추가 제품 페이지로 연결.
          }}
        />
      );
      break;
    case 'share_card_makeup':
      view = (
        <ShareCard
          variant="makeup"
          result={result}
          card={activeCard}
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

  // 사용 안 한 photo 변수 lint 경고 회피용. 실제 분석 호출에 쓰일 자리.
  void photo;

  // 단일 폰 화면 뷰포트. 데스크톱에서는 480px 캡으로 가운데 정렬.
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {view}
    </div>
  );
}
