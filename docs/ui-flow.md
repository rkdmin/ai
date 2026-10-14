---
last-verified: "2026-10-14"
---

# UI Flow

> **기능이 변경될 때마다 이 파일을 반드시 함께 수정하세요.**
> 수정 대상 목록 → `CLAUDE.md` 상단 "문서 업데이트 규칙" 참고

---

## 앱 탭 구조

현재 하단 탭바는 4개다.

```
[홈] [스타일] [케미] [마이]
```

- `home`: 새 분석 시작 + 최근 기록 이어보기
- `style`: 스타일 콘텐츠 준비 중 화면
- `chemistry`: 케미 콘텐츠 준비 중 화면
- `my`: 계정과 Beauty Profile 확인

인증 게이트:
- 홈의 히스토리 진입은 로그인 사용자에게만 열고, 비로그인 사용자는 `guest_gate` 로 보낸다.
- `guest_gate` 에서 OAuth 로그인 성공 시 원래 의도한 기록 목록/상세로 복귀한다.

---

## 화면 상태 맵 (`App.jsx`)

```txt
flow: splash → home
  login과 onboarding 화면은 후속 시각 정렬을 위해 남아 있지만 첫 진입을 막지 않음

main: home | style | chemistry | my

analysis: upload → personal_color → loading → result_home
  → hair_loading → result_tabs_hair
  → makeup_loading → result_tabs_makeup
  → synth_loading

detail: history | history_detail | card_detail | makeup_detail
  origin: 진입한 main/analysis/detail route

sheet: guest_gate | ad_gate | share_card | share_card_makeup
  origin: 시트를 연 route

home
  → upload → personal_color → loading → result_home
  → history → history_detail
  → guest_gate

result_home
  → hair_loading → result_tabs_hair → card_detail → ad_gate → synth_loading
  → makeup_loading → result_tabs_makeup → makeup_detail → ad_gate
  → share_card | share_card_makeup
```

핵심 포인트:
- 하나의 `stage` 문자열 대신 `main`·`analysis`·`detail`·`sheet`·`flow` route를 분리한다.
- 하단 탭바는 `main` 네 화면에서만 표시하며 분석·결과·결제·상세·시트에서는 숨긴다.
- `history_detail` 은 `home recent` 와 `history list` 두 곳에서 모두 진입한다.
- 상세와 시트는 `origin` route를 보관해 화면 버튼·브라우저·Android 뒤로가기가 같은 출처로 복귀한다.
- 탭 전환은 route만 바꾸고 현재 분석 결과를 유지한다.
- 분석·카드·합성 요청은 요청 ID로 보호해 이탈 또는 새 요청 뒤 늦게 도착한 응답을 무시한다.
- `ad_gate` 뒤 이동 위치는 고정이 아니라 `adReturn` 상태로 결정한다.
- `share_card` 는 헤어 결과 공유, `share_card_makeup` 은 메이크업 결과 공유다.

---

## 뒤로가기 규칙

- `onboarding2` → `onboarding1`
- `onboarding3` → `onboarding2`
- `login` / `guest_gate` → `home`
- `upload` → `home`
- `personal_color` → `upload`
- `loading` / `error_face` / `error_network` → `home`
- `result_home` → `home`
- `hair_loading` / `makeup_loading` → `result_home`
- `result_tabs_hair` / `result_tabs_makeup` → `result_home`
- `card_detail` → `result_tabs_hair`
- `makeup_detail` → `result_tabs_makeup`
- `ad_gate` → `adReturn.back` (없으면 `result_tabs_hair`)
- `share_card` → `activeCard` 가 있으면 `card_detail`, 없으면 `result_home`
- `share_card_makeup` → `makeup_detail`
- `style` / `chemistry` / `my` → `home`
- `history_detail` → route의 `origin` 기준 복귀
  - `home recent` 에서 열었으면 `home`
  - `history list` 에서 열었으면 `history`
- `synth_loading` → **뒤로가기 없음** (`PARENT_STAGE` 에 없어 back 이 무시된다. 합성 중 이탈 방지)

구현은 `src/utils/navigation.js` 에 있다. 분석 화면의 고정 복귀 지점은 `ANALYSIS_PARENT`,
진입 맥락에 따라 달라지는 상세·시트는 각 route의 `origin`과 `resolveBackRoute(route)`가 결정한다.
Capacitor Android 하드웨어 back 은 브라우저 `popstate` 와 같은 `onPop` 을 탄다.

**화면 안의 닫기 버튼과 하드웨어 back 은 같은 결과를 내야 한다.** 새 화면을 추가할 때
그 화면의 route 종류와 `origin` 또는 `ANALYSIS_PARENT`를 함께 정의한다.
회귀는 `test/navigation.test.js`와 `test/requestGate.test.js`가 지킨다.

루트 화면은 둘이다 — `home`, 그리고 첫 방문 흐름의 `onboarding1`. 둘은 뒤로 갈 곳이 없다.

---

## Splash / Onboarding / Login

### Splash (`stage: 'splash'`)

- 200ms 후 다음 화면으로 이동 (`Splash.jsx` 의 `setTimeout`)
- 로그인·온보딩을 강제하지 않고 항상 `home`으로 이동한다.

### Onboarding (`onboarding1~3`)

- 3장 구성
- 마지막 화면 완료 시 `beaumi.onboarded = '1'` 저장 후 `login`
- 중간 스킵도 가능

### Login (`stage: 'login' | 'guest_gate'`)

공통:
- 카카오 OAuth
- 구글 OAuth

`login` 전용:
- 게스트 1회 체험 버튼 노출

`guest_gate` 전용:
- 진입 이유별 카피 분기
  - `history`
  - `history_detail`
  - `my`
  - `unlock`
- 로그인 성공 후 `authBridge.consumePostAuthTarget()` 으로 원래 목적지 복귀

---

## Home (`main: 'home'`)

**컴포넌트:** `Home.jsx`

구성:
- 상단 history 아이콘
- Figma `home-wireframe`의 Hero 설명
- `AI가 이렇게 분석해요` 3단계 구조 카드
- 분석 결과 미리보기 카드 (운영값을 지어내지 않고 중립 이미지·fallback 제목 사용)
- Primary CTA: `내 Beauty Mood 분석하기` → `upload`
- 미리보기 카드 CTA도 Figma의 `전체 결과 예시 보기 →`(샘플 결과 시트 `108:2659`) 대신 `내 결과 만들기 →`로 `upload`에 연결한다. 아직 제품 경로에 제공할 검증된 샘플 결과 시트가 없어 막힌 예시 화면보다 실제 분석 시작을 우선한 결정이다.
- `RECENT` 섹션
- 기기에 복원된 최근 Beauty Profile이 있으면 미리보기 카드에 같은 결과를 표시한다. 원본 사진은 기기 저장본에 넣지 않는다.

`RECENT` 규칙:
- 로그인 사용자만 `fetchHistory(3)` 호출
- 게스트는 API 호출 없이 로그인 유도 empty copy만 노출
- recent 카드 클릭 시 `history_detail` 진입
- recent 카드에서 열린 상세는 뒤로가기 시 `home` 으로 복귀

Beauty Profile 복원 규칙:
- 저장 키는 사용자 범위와 응답 `schemaVersion`을 포함한다.
- 게스트 결과와 로그인 계정 결과를 분리하며, 로그아웃·계정 전환 직후 이전 계정 결과를 먼저 비운다.
- 로그인 사용자는 서버 최신 히스토리 상세를 우선하고, 서버를 불러올 수 없거나 기록이 없을 때만 해당 계정의 기기 저장본으로 폴백한다.
- `legacy: true` 저장본에는 원래 없던 무드·Traits 필드를 채워 넣지 않는다.

---

## Photo Upload (`stage: 'upload'`)

**컴포넌트:** `PhotoUpload.jsx`

- 한 컴포넌트 안에서 Figma의 두 상태를 전환한다: 사진이 없으면 `photo-guide`, 선택 후에는 `photo-confirm`.
- 정면 사진 1장. 입력 경로는 플랫폼 분기 — 네이티브는 `@capacitor/camera`(카메라/갤러리),
  웹은 파일 picker 폴백
- 촬영 가이드 5항목(앞머리를 올린 정면 / 후면 기본 카메라 / 얼굴 윤곽과 어깨 / 밝은 곳·역광 없음 /
  필터 없는 자연스러운 표정)과 피하면 좋은 사진 3항목(측면 / 얼굴 가림 / 강한 필터)을 노출한다.
  전체 촬영 기준과 UI 축약 원칙은 `docs/PHOTO_GUIDE.md`에 있다.
- 사진 선택 후 확인 화면은 사전검사 결과를 단정하지 않고 정면·전체 윤곽·필터/역광을 사용자가 다시 보는
  질문형 체크리스트를 표시한다. F03 사전검사가 연결되기 전까지 중립 불릿만 쓴다.
- **`이 사진으로 분석하기`는 사진 + 동의 체크가 모두 있어야 진행된다.** 사진만 고르면 넘어가지 않는다
  - 동의 없음 → "사진 분석 동의에 체크해 주세요"
  - 사진 없음 → 카메라 선택 시트를 다시 연다
- 10MB 초과 시 거부
- NEXT 통과 시 `onUpload(file, dataUrl)` → `photo = { file, dataUrl }` 저장 후 `personal_color` 로 이동
- `VITE_MOCK=true` 일 때만 `🧪 샘플 얼굴 사용` 버튼 노출 (운영 빌드 제외)

---

## Personal Color (`stage: 'personal_color'`)

**컴포넌트:** `PersonalColor.jsx`

- `wf-*` 시스템의 `BackHeader`·스크롤 본문·하단 footer를 사용하고, 4계절 선택지는 radius 8의 `wf-card`로 표시한다.
- 퍼스널컬러 선택 후 `선택하고 분석하기`, 모르면 `잘 모르겠어요 · 건너뛰기`
- 선택값은 한국어 라벨로 `personalColor` 상태에 저장
- 다음 진행 시 `startAnalysis()`

---

## 분석 로딩 / 에러

### Analysis Loading (`stage: 'loading'`)

**컴포넌트:** `Loading.jsx`

- 내부 task: `analyzeFace(photo.dataUrl, backendPersonalColorKey(personalColor))`
- Figma `analysis-loading`에 맞춰 원형 사진, 4단계 상태(`완료 / 분석 중 / 대기`), 보조 문구와 1.2초 주기로
  순환하는 점 3개를 표시한다. 모션 감소 설정에서는 점을 정지한다.
- 성공:
  - 정상 결과 → `result_home`
  - `faceType === '판정 어려움'` → `error_face`
- 실패:
  - 네트워크성 에러 → `error_network`
  - 그 외 → `error_face`
- 백엔드에서 MediaPipe 가 얼굴을 못 찾으면 **Gemini 를 호출하지 않고 400** 으로 끊는다
  (유료 호출을 막는 무료 게이트). 프론트는 `status < 500` 이라 `error_face` 로 분기한다.
  단 일러스트·3D 렌더링·마네킹은 랜드마크가 잡혀 이 게이트를 통과한다

### Error (`stage: 'error_face' | 'error_network'`)

**컴포넌트:** `ErrorScreen.jsx`

- `error_face`
  - 재시도 → `upload`
  - 뒤로 → `home`
- `error_network`
  - 카드 생성 전 에러면 `startAnalysis()` 재시도
  - 카드 생성 후 에러면 `result_home` 으로 복귀

---

## 분석 결과 (`stage: 'result_home'`)

**컴포넌트:** `AnalysisResult.jsx`

표시:
- 업로드 사진 또는 저장된 `frontImageUrl`을 결과 Hero에 표시
- `MY BEAUTY MOOD` 제목 (`styleLabel`이 없으면 거짓 라벨을 만들지 않고 `나의 Beauty Mood`)
- 얼굴형·퍼스널컬러
- 현재 API의 `moodArchetype` 3개는 동급 무드다. 첫 항목은 Primary, 나머지 0~2개는 `함께 나타난 무드`
  칩으로 표시한다. D01의 별도 사전이 생기기 전에는 이 값을 Traits로 부르지 않는다.
- `features` **0~3개** — 개수에 맞춰 제목이 `TOP n FEATURES` 로 바뀐다.
  0개면 `FEATURES` + "뚜렷하게 두드러지는 특징 없이 전체적으로 균형 잡힌 얼굴이에요" 안내.
  **더미 특징으로 채우지 않는다** (`docs/decisions/0009-analysis-consistency-rules.md`)
- 공유 버튼
- 헤더 뒤로가기 → `home`
- `result.analysisId` 가 있으면(로그인 분석) CTA 위에 `SAVED · 이 분석은 히스토리에 저장됐어요` 배지

CTA (1차/2차 위계 — 동등 그리드 아님):
- 1차: `헤어 추천 보기` (full-width dark 버튼, `1ST · START HERE` 라벨) → 캐시 없으면 `hair_loading`, 있으면 `result_tabs_hair`
- 2차: `메이크업 추천 보기` (full-width outline 버튼, 시각 비중 낮춤) → 캐시 없으면 `makeup_loading`, 있으면 `result_tabs_makeup`

주의:
- 결과 화면 핵심 결정("헤어 vs 메이크업")의 망설임을 줄이기 위해 헤어를 1차 CTA 로 고정한다.
- 백엔드에는 `total` 카드 API 가 있지만 현재 v1.0 UI에는 진입 CTA 가 없다.
- Figma의 결제·케미·통합 리포트 CTA는 현재 프론트 흐름에 연결된 기능이 없어 이번 시각 정렬 범위에서 제외한다.

---

## 헤어 카드 플로우

### Hair Loading (`stage: 'hair_loading'`)

- `generateHairCards(payload)` 호출
- 성공 → `result_tabs_hair`

### Hair List (`stage: 'result_tabs_hair'`)

**컴포넌트:** `CardList.jsx`

- 카드 선택 시:
  - 잠금 카드면 `ad_gate`
  - 아니면 `card_detail`

### Hair Detail (`stage: 'card_detail'`)

**컴포넌트:** `CardDetail.jsx`

- 공유 버튼
- 하단 sticky CTA — 합성 상태에 따라 조건 분기:
  - 합성 전: `SHARE`(2차 outline) + `합성 보기`(1차 dark) → 광고 게이트 후 `synth_loading`
  - 합성 후: `다시 보기`(2차 outline, 재생성) + `결과 공유`(1차 dark) → 1차 행동이 공유로 전환
- AI SYNTHESIS 섹션 버튼: `WATCH AD & SYNTHESIZE` / 합성 후 `WATCH AD & SHOW AGAIN`

### Ad Gate / Synthesis

- `ad_gate`
  - 잠금 카드 해제용 또는 합성 보기용으로 공용 사용
- `synth_loading`
  - `generateStyledPhoto(photo?.dataUrl || null, card)`
  - 이미 생성한 카드면 `synthByKey` 캐시 사용
- 합성 성공 시 같은 `card_detail` 로 복귀

중요:
- 저장된 히스토리에서 다시 연 헤어 카드도 `analysisId` 를 유지해야 한다.
- 그래야 로그인 전용 TRY ON 이 저장된 분석 기준으로 재사용된다.

---

## 메이크업 카드 플로우

### Makeup Loading (`stage: 'makeup_loading'`)

- `generateMakeupCards(payload)` 호출
- 성공 → `result_tabs_makeup`

### Makeup List (`stage: 'result_tabs_makeup'`)

**컴포넌트:** `CardList.jsx`

- 카드 선택 시:
  - 잠금 카드면 `ad_gate`
  - 아니면 `makeup_detail`

### Makeup Detail (`stage: 'makeup_detail'`)

**컴포넌트:** `MakeupDetail.jsx`

- 공유 버튼
- 제품 블록: 실제 `coupangPartnersUrl` 이 있는 제품이 하나라도 있을 때만 구매 affordance(`쿠팡에서 보기 →`)와 쿠팡 제휴 고지를 노출한다. 링크가 없으면 `검색 키워드 · {searchKeyword}` 형태로 정직하게 표시(가격·고지 없음).
  - **현재 백엔드는 `recommendedProducts` 를 채우지 않는다** — `PRODUCTS_MOCK` fallback 이 쓰인다.
    따라서 구매 affordance 는 실제로는 노출되지 않는 상태다 (Phase 5 범위)
  - 링크 열기는 `src/utils/external.js` 의 `openExternalUrl` — 네이티브는 시스템 브라우저, 웹은 새 탭
- 정책상 사진 합성은 지원하지 않는다 (`onSynthesize` 로 가는 진입점이 없다)
- 하단 sticky CTA
  - `OTHER LOOKS`
  - `SHARE LOOK`

---

## 공유

### Hair Share (`stage: 'share_card'`)

- `activeCard` 가 있으면 상세 기반 공유, 없으면 분석 결과 공유
- 합성 사진(`synthByKey[cardKey(activeCard)]`)을 `synthesizedPhoto` 로 전달
  - 합성 사진 있음 → before/after 비교형(실제 `photoUrl`/`synthesizedPhoto` 반영)
  - 합성 사진 없음 → 결과 카드형(REFERENCE 1장, 가짜 AFTER 없음)
- CTA: `SAVE IMAGE`(1차) + `공유`/`링크 복사`(2차). 캡처는 html2canvas 동적 import, 미설치/실패 시 안내 토스트 폴백
- 저장·공유는 플랫폼 분기 (`isNativePlatform()`)
  - **네이티브**: 저장은 `@capacitor/filesystem` 으로 기기 `Documents` 에 기록
    (`<a download>` 는 WebView 에서 동작하지 않는다). 공유는 `@capacitor/share` 로 파일 첨부 시트.
    사용자가 시트를 닫으면 조용히 무시한다
  - **웹**: 저장은 `<a download>`, 공유는 Web Share API → 실패 시 클립보드 텍스트 복사 폴백

### Makeup Share (`stage: 'share_card_makeup'`)

- 메이크업 상세 기반 공유 (정책상 합성 사진 없음 → 결과 카드형)

---

## Trend (`stage: 'trend'`)

**컴포넌트:** `Trend.jsx`

- v1.0은 "준비 중" 경량 화면. mock 피드/가짜 saves 수치/필터/검색 버튼을 모두 제거하고, `coming soon` 안내 + `START ANALYSIS`(→ home) CTA 만 둔다.
- 트렌드 피드 실데이터(백엔드 API 또는 정적 큐레이션 JSON)는 v1.x 범위. 탭 자체는 유지한다.

---

## History (`stage: 'history'`)

**컴포넌트:** `History.jsx`

- 로그인 필요
- 진입 시 `fetchHistory(5)`
- 최근 5회 기록 표시
- `EDIT` 모드에서는 로컬 UI 에서만 숨김 처리
- `NEW ANALYSIS` → `upload`
- row 클릭 → `history_detail`

상태:
- 로딩 UI
- 에러 UI
- 사진 만료(`photoExpired`) 오버레이
- empty archive UI

---

## History Detail (`stage: 'history_detail'`)

**컴포넌트:** `HistoryDetail.jsx`

- 진입 시 `fetchHistoryDetail(analysisId)`
- 표시 정보
  - 분석 요약
  - 저장된 feature 태그
  - 다시 열 수 있는 카드 세트
  - 생성된 사진 목록
- `HAIR` / `MAKEUP` 버튼으로 저장된 카드 세트를 현재 플로우에 다시 주입
- `TOTAL` 카드 기록은 안내만 하고 현재 UI 에서 직접 재오픈하지 않는다
- `NEW ANALYSIS` → `upload`

재오픈 규칙:
- `mapCards()` 로 현재 카드 UI shape 로 다시 매핑
- 각 카드에 `analysisId` 를 다시 넣는다

---

## My (`main: 'my'`)

**컴포넌트:** `My.jsx`

- 게스트도 접근할 수 있으며 홈과 동일한 최근 Beauty Profile을 표시한다.
- 로그인 프로필은 세션 access token(JWT)에서 `email` / `app_metadata.provider` 를 읽고, 게스트는 기기 저장 상태를 표시한다.
- 메뉴: 분석 히스토리(→ history) + 개인정보/약관/고객센터 링크. 데이터 소스 없는 fake stats·유저 퍼스널컬러·dead 메뉴(저장한 카드/공유한 결과/알림 설정)·settings 버튼은 제거 (Phase 4-7 mock 축소)
- 로그인 사용자는 로그아웃, 게스트는 로그인 화면 진입이 가능하다. 로그아웃 시 계정 저장본 대신 게스트 저장본으로 즉시 전환한다.
- 계정 삭제 2단계 확인 시트 존재 (실제 삭제 API 는 아직 미연결 — alert 안내)
- 분석 횟수 등 실통계는 `GET /api/me` 추가 시 연결 (v1.x)

---

## 주요 상태 (`App.jsx`)

```js
route: { kind: 'main' | 'analysis' | 'detail' | 'sheet' | 'flow', tab?: string, screen?: string, origin?: Route }
photo: { file, dataUrl } | null
personalColor: string | null
result: {
  analysisId?: string | null,
  faceType: string,
  features?: string[],
  personalColor?: string | null,
  frontImageUrl?: string | null,
} | null
hairCards: CardObject[] | null
makeupCards: CardObject[] | null
activeCard: CardObject | null
adReturn: { done: string, back: string }
synthByKey: Record<string, string>
errorInfo: { type: 'face' | 'network', message: string }
guestGateReason: 'history' | 'history_detail' | 'my' | 'unlock'
historySelection: { analysisId: string | null }
```
