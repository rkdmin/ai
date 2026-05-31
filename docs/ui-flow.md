# UI Flow

> **기능이 변경될 때마다 이 파일을 반드시 함께 수정하세요.**
> 수정 대상 목록 → `CLAUDE.md` 상단 "문서 업데이트 규칙" 참고

---

## 앱 탭 구조

현재 하단 탭바는 4개다.

```
[홈] [트렌드] [히스토리] [마이]
```

- `home`: 새 분석 시작 + 최근 기록 이어보기
- `trend`: 정적 mock 피드
- `history`: 로그인 사용자만 접근 가능
- `my`: 로그인 사용자만 접근 가능

인증 게이트:
- 비로그인 사용자가 `history`, `my` 로 이동하면 `guest_gate` 로 보낸다.
- `guest_gate` 에서 OAuth 로그인 성공 시 원래 의도한 탭/기록 상세로 복귀한다.

---

## 전체 stage 맵 (`App.jsx`)

```txt
splash
  → onboarding1 → onboarding2 → onboarding3
  → login | home

home
  → upload → personal_color → loading → result_home
  → trend
  → history → history_detail
  → my
  → guest_gate

result_home
  → hair_loading → result_tabs_hair → card_detail → ad_gate → synth_loading
  → makeup_loading → result_tabs_makeup → makeup_detail → ad_gate
  → share_card | share_card_makeup
```

핵심 포인트:
- `history_detail` 은 `home recent` 와 `history list` 두 곳에서 모두 진입한다.
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
- `share_card` → `activeCard` 가 있으면 `card_detail`, 없으면 `result_home`
- `share_card_makeup` → `makeup_detail`
- `history` / `my` / `trend` → `home`
- `history_detail` → 진입 출처 기준 복귀
  - `home recent` 에서 열었으면 `home`
  - `history list` 에서 열었으면 `history`

Capacitor Android 하드웨어 back 도 같은 규칙을 따른다.

---

## Splash / Onboarding / Login

### Splash (`stage: 'splash'`)

- 1초 후 다음 화면으로 이동
- `localStorage['beaumi.onboarded'] === '1'` 이면 `home`
- 아니면 `onboarding1`

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

## Home (`stage: 'home'`)

**컴포넌트:** `Home.jsx`

구성:
- 상단 history 아이콘
- Hero CTA: `START ANALYSIS`
- 탐색 타일 4개
  - `ANALYZE` → `upload`
  - `RESULTS` → `history`
  - `HISTORY` → `history`
  - `MY` → `my`
- `RECENT` 섹션

`RECENT` 규칙:
- 로그인 사용자만 `fetchHistory(3)` 호출
- 게스트는 API 호출 없이 로그인 유도 empty copy만 노출
- recent 카드 클릭 시 `history_detail` 진입
- recent 카드에서 열린 상세는 뒤로가기 시 `home` 으로 복귀

---

## Photo Upload (`stage: 'upload'`)

**컴포넌트:** `PhotoUpload.jsx`

- 정면 사진 1장 업로드
- 업로드 성공 시 `photo = { file, dataUrl }`
- 완료 즉시 `personal_color` 로 이동

---

## Personal Color (`stage: 'personal_color'`)

**컴포넌트:** `PersonalColor.jsx`

- 퍼스널컬러 선택
- 선택값은 한국어 라벨로 `personalColor` 상태에 저장
- 다음 진행 시 `startAnalysis()`

---

## 분석 로딩 / 에러

### Analysis Loading (`stage: 'loading'`)

**컴포넌트:** `Loading.jsx`

- 내부 task: `analyzeFace(photo.dataUrl, backendPersonalColorKey(personalColor))`
- 성공:
  - 정상 결과 → `result_home`
  - `faceType === '판정 어려움'` → `error_face`
- 실패:
  - 네트워크성 에러 → `error_network`
  - 그 외 → `error_face`

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
- 업로드 사진 또는 저장된 `frontImageUrl`
- 얼굴형
- 퍼스널컬러
- `moodArchetype` 3개
- `features` 최대 3개
- 공유 버튼

CTA:
- `헤어 추천 받기` → 캐시 없으면 `hair_loading`, 있으면 `result_tabs_hair`
- `메이크업 받기` → 캐시 없으면 `makeup_loading`, 있으면 `result_tabs_makeup`

주의:
- 백엔드에는 `total` 카드 API 가 있지만 현재 v1.0 UI에는 진입 CTA 가 없다.

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
- 하단 sticky CTA
  - `SHARE`
  - `TRY ON`
- `TRY ON` 은 광고 게이트 후 `synth_loading`

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
- 제품 블록과 쿠팡 제휴 고지 노출
- 정책상 사진 합성은 지원하지 않는다
- 하단 sticky CTA
  - `OTHER LOOKS`
  - `SHARE LOOK`

---

## 공유

### Hair Share (`stage: 'share_card'`)

- `activeCard` 가 있으면 상세 기반 공유
- 없으면 분석 결과 공유

### Makeup Share (`stage: 'share_card_makeup'`)

- 메이크업 상세 기반 공유

---

## Trend (`stage: 'trend'`)

**컴포넌트:** `Trend.jsx`

- 현재 정적 mock 피드
- 필터, 검색 버튼, 카드 모두 실데이터 연결 전 시안 수준

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

## My (`stage: 'my'`)

**컴포넌트:** `My.jsx`

- 로그인 필요
- 현재 mock 프로필/통계/메뉴 중심
- 로그아웃 가능
- 계정 삭제 2단계 확인 시트 존재
- 실제 계정 삭제 API 는 아직 미연결

---

## 주요 상태 (`App.jsx`)

```js
stage: string
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
historySelection: { analysisId: string | null, back: 'home' | 'history' }
```
