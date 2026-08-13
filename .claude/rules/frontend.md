---
paths:
  - "src/**"
  - "test/**"
  - "index.html"
---

# 프론트엔드 작업 규칙 (React + Vite, 웹/Capacitor 공용)

## Beaumi 디자인 시스템

| 영역 | 값 |
|------|---|
| 컬러 | `#fff` 배경 + `#000` 라인/텍스트, 액센트 `#f6f1ed` (warm beige), 경고 `#c45a3b` |
| 폰트 | Pretendard (한글), Jost (영문 라벨, `letter-spacing: .22em` uppercase), Cormorant Garamond Italic (nº 표기) |
| 모서리 | 0px (사각 그리드) |
| 톤 | 에디토리얼 매거진 — 1px 검정 라인 + 큰 흑백 사진 |

토큰은 `src/styles/tokens.css`, 유틸 클래스는 `src/styles/globals.css` 에 있다. 새 색·폰트·간격을
컴포넌트에 하드코딩하지 말고 토큰에 추가한 뒤 참조한다.

### 라벨 패턴 (어디서든 동일)
- `STEP 04 · TRY ON` (Jost uppercase + 12px) — `.label` 유틸 클래스
- `nº 01` (serif italic) — `.serif-i`
- `1ST · BEST MATCH` (Jost uppercase)
- `ROMANTIC` / `CLEAN` / `SOFT` (무드 키워드 — **인물 이름 절대 X**)

### 절대 추가 금지 (법적 리스크 — 퍼블리시티권)
- 실제 연예인 이름·사진
- "닮은꼴" / "look-alike" 비교 기능
- "○○ st" 표기
- 인물 비주얼은 모두 추상 무드 카드 또는 가상 placeholder (`src/components/common/Placeholders.jsx`)

> 배경 판례와 정책 변경 경위: `src/handoff/CLAUDE_CODE_NOTES.md`
> 이 규칙은 `.claude/hooks/check-file.mjs` 가 저장 시점에 정규식으로 차단한다.

## 컴포넌트 지도

`src/components/` — 화면 단위. STEP 표기는 사용자 플로우 순서다.

| 파일 | 역할 |
|------|------|
| `Splash.jsx` | 진입 스플래시 + 세션/딥링크 복원 |
| `Onboarding.jsx` | 3-step 온보딩 (로컬 플래그) |
| `Home.jsx` | 홈 랜딩 + 최근 기록 1~3개 이어보기 (로그인 사용자만 fetch) |
| `Login.jsx` | OAuth 로그인 + 게스트 체험 + guest gate 카피 분기 |
| `PhotoUpload.jsx` | STEP 01 — 정면 사진 1장 + DO/DON'T 가이드 타일 (네이티브 카메라/갤러리 브리지 + 웹 폴백) |
| `PersonalColor.jsx` | 퍼스널컬러 4계절 선택 / skip (분석 직전 보조 입력) |
| `Loading.jsx` | STEP 02 — 4-step 분석 로딩 (FACE DETECTION → CARD CURATION) |
| `ErrorScreen.jsx` | face / network 에러 화면 (type별 tip + CTA) |
| `AnalysisResult.jsx` | STEP 02 결과 — MOOD KEYS / FEATURES / RECOMMENDATIONS |
| `CardList.jsx` | STEP 03 — 카드 4장 (rank1 무료 + 2·3 광고 잠금 + AVOID) |
| `CardDetail.jsx` | STEP 04 — AI COMMENTARY / PERSONAL FIT / MOOD BOARD / AI SYNTHESIS (헤어/종합) |
| `MakeupDetail.jsx` | 메이크업 카드 상세 — palette / part guide / 추천 제품 + 쿠팡 링크 |
| `AdGate.jsx` | 15초 광고 게이트 (잠금 카드 / 사진 합성 공통) |
| `ShareCard.jsx` | 공유 카드 오버레이 (결과 카드형 / before·after 비교형, 네이티브 공유·저장 브리지 + 웹 폴백) |
| `History.jsx` | 최근 5회 분석 기록 목록 + 새 분석 진입 |
| `HistoryDetail.jsx` | 저장된 분석/카드/생성 사진 재열람 + 카드 재오픈 |
| `Trend.jsx` | 트렌드 "준비 중" 경량 화면 + START ANALYSIS CTA |
| `My.jsx` | 계정 화면 — 세션 JWT email/provider 실데이터 + 계정 삭제 시트 |

`src/components/common/` — 공용 프리미티브.
`Icons.jsx` (인라인 SVG) / `Layout.jsx` (BackHeader·Section·IndexMark·CtaTile·TabBar·StepDots) /
`StatusBar.jsx` (상단 상태바 목업) / `StateNotice.jsx` (공통 empty·error·loading 블록) /
`ErrorBoundary.jsx` (렌더 크래시 폴백 + Sentry) / `Placeholders.jsx` (FacePlaceholder·MosaicOverlay·ProductPlaceholder)

## 그 외 디렉토리

- `src/api/` — `ai.js` 가 프로바이더 라우터(mock/backend 분기). 컴포넌트는 `backend.js` 를 직접 import 하지 않고 `ai.js` 만 쓴다.
- `src/contexts/AuthContext.jsx` — Supabase 세션/로그인 상태. `signInAsTestUser` 는 mock 전용.
- `src/utils/` — `authBridge.js` (OAuth redirect 복원 + post-login return target), `external.js` (외부 URL 시스템 브라우저), `platform.js` (`isNativePlatform`), `sentry.js` (`VITE_SENTRY_DSN` 게이트), `validateImage.js` (Canvas 유효성 검사)
- `src/hooks/useHaptic.js` — Capacitor Haptics 브리지 (웹 폴백 분기)
- `src/devtools/` — `VITE_DEV_INSPECTOR=true` 일 때만 활성. 운영 빌드에서 트리 셰이킹되어야 하므로 전역 import 금지.

## 불변식

1. **네이티브 기능은 항상 웹 폴백을 함께 둔다.** 카메라/갤러리·공유·저장·외부 링크·햅틱은 모두
   `isNativePlatform()` 분기 + 웹 경로가 있다. 폴백 없는 네이티브 전용 코드는 `npm run dev` 를 깨뜨린다.
2. **mock 전용 자산은 게이트 뒤에 둔다.** `src/assets/dev-sample-face.jpg` 는 `VITE_MOCK` 게이트이며
   운영 빌드에 포함되면 안 된다.
3. **`판정 어려움` 응답을 반드시 처리한다.** 카드 생성 대신 "여러 얼굴형 특징이 섞여 있어요" 안내를 띄운다.
4. **컴포넌트 동작·조건·state 를 바꾸면 `docs/ui-flow.md` 를 같은 작업에서 갱신한다.**

## 검증

```bash
npm run test
npm run lint
```

테스트는 `test/*.test.jsx` (vitest + Testing Library). 컴포넌트를 추가·변경하면 해당 테스트도 함께 손본다.

lint 규칙은 루트 `eslint.config.js` (ESLint 9 flat config).

- **`use` 접두사는 실제 React 훅에만 쓴다.** 평범한 핸들러에 붙이면 `react-hooks/rules-of-hooks`
  가 위반으로 잡고, 읽는 사람도 훅으로 오해한다.
- **안 쓰는 인자는 `_` 접두사** (`_analysis` 등). mock 구현에서 쓰는 관례다.
- **받았지만 안 쓰는 prop 은 `void prop;` + 이유 주석.** `CardDetail` / `MakeupDetail` 이
  이 방식으로 props 모양을 맞춘다.
- `src/handoff/**` 는 디자인 스냅샷 사본이라 lint 대상이 아니다.
테스트 구조와 품질 게이트는 `docs/test.md` 참조.
