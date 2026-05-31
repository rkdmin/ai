# Phase 4 UX/UI

> 작성일: 2026-05-12
> 기준 브랜치 상태: `fc80c70`
> 범위: 현재 웹/Capacitor 공용 프론트엔드의 UX/UI 현상 분석과 Phase 4 실행 계획

---

## 1. 목표

Phase 4의 목적은 "예쁘게 보이게 만드는 것"이 아니다. 현재 붙어 있는 분석, 카드, 인증, 히스토리 기능을 사용자가 **막히지 않고**, **이유를 이해하면서**, **다음 행동을 자연스럽게 선택할 수 있게** 만드는 것이다.

이 단계의 성공 기준은 아래 4가지다.

1. 첫 방문 사용자가 `홈 -> 업로드 -> 분석 -> 카드 -> 상세 -> 공유/저장` 흐름을 혼란 없이 완주한다.
2. 로그인/게스트/잠금/광고/히스토리 제약이 "갑자기 막히는 규칙"이 아니라 "예상 가능한 규칙"으로 느껴진다.
3. mock UI와 실제 연결 UI의 차이가 줄어들고, 화면마다 정보 밀도와 CTA 체계가 일관된다.
4. 이후 v1.1 광고, 트렌드, 마이페이지 확장 시 구조를 다시 갈아엎지 않아도 된다.

---

## 2. 현재 상태 요약

현재 앱은 다음 강점이 있다.

- 분석 메인 플로우는 이미 한 번 끝까지 이어진다.
- 로딩, 결과, 카드 목록, 상세, 공유까지 기본 화면 수는 충분하다.
- Supabase 인증/히스토리 wiring이 붙기 시작해서 "보여주기용 시안" 단계는 지났다.
- 모바일 안전영역, 하단 탭, sticky CTA, 하드웨어 back 대응 같은 모바일 감각은 들어가 있다.

현재 앱의 핵심 문제는 다음 5가지다.

1. **상태 모델이 화면 수를 따라가지 못한다.**
   - `src/App.jsx`에 stage가 과도하게 많고, 화면 전환 규칙이 컴포넌트 밖에 흩어져 있다.
   - hair/makeup/result/share/ad 흐름이 분기되면서 회귀 위험이 커졌다.

2. **실제 연결된 화면과 아직 mock인 화면의 품질 차이가 크다.**
   - `History.jsx`는 API를 읽지만 상세 진입이 없다.
   - `Home.jsx` recent, `Trend.jsx`, `My.jsx`는 아직 mock 중심이다.
   - 사용자는 동일한 제품 안에서 "완성된 화면"과 "비어 있는 화면"을 번갈아 만나게 된다.

3. **CTA 우선순위가 화면마다 다르다.**
   - 어떤 화면은 1차 CTA가 명확하지만, 어떤 화면은 버튼이 2개 이상 경쟁한다.
   - 잠금 해제, 합성 보기, 공유, 다른 카드 보기, 새 분석 시작 같은 행동이 계층 없이 나열된다.

4. **정보 구조가 "예쁜 카드" 중심이고 "의사결정" 중심이 아니다.**
   - 결과 화면은 분위기와 라벨은 잘 보여주지만, 사용자가 "그래서 뭘 눌러야 하는지"는 더 강하게 밀어줘야 한다.
   - 카드 상세는 정보가 길지만, 저장/비교/다음 카드 이동 같은 반복 행동은 아직 약하다.

5. **Phase 3에서 추가된 인증/히스토리 제약이 UX 문장으로 정리되지 않았다.**
   - guest gate, 잠금, photo expiry, 로그인 전용 기능이 화면별로 따로 나타난다.
   - 규칙 설명과 예외 처리 문장이 통일되어 있지 않다.

### 2.1 2026-05-12 구현 반영

이번 라운드에서 실제로 반영된 내용은 아래다.

- `Home.jsx` recent 가 mock 이 아니라 `fetchHistory(3)` 기반으로 동작한다.
- 게스트 사용자는 홈 recent 에서 보호된 history API 를 호출하지 않는다.
- `History.jsx` 목록 row 클릭으로 `HistoryDetail.jsx` 진입이 가능하다.
- `HistoryDetail.jsx` 에서 저장된 헤어/메이크업 카드 세트를 현재 카드 UI로 다시 열 수 있다.
- `authBridge.js` 에 post-login return target 저장/복귀가 들어갔다.
- `Login.jsx` guest gate 카피가 `history`, `history_detail`, `my`, `unlock` reason 별로 분기된다.

아직 남은 핵심 문제는 아래다.

- `AnalysisResult.jsx` 는 여전히 hair / makeup CTA 가 동등해서 primary action 이 한눈에 정리되지 않는다.
- `Trend.jsx`, `My.jsx`, `MakeupDetail.jsx` 일부 action 은 여전히 mock 또는 dead 상태다.
- 공유 결과물, sticky CTA hierarchy, empty/error/loading 카피 통일은 아직 덜 끝났다.

---

## 3. P0 / P1 / P2 우선순위

### P0

- 분석 메인 퍼널 완성도
- 결과/카드/상세 CTA 정리
- 히스토리 상세 진입
- 게스트/로그인/잠금 규칙 일관화
- mock 상태가 강하게 드러나는 화면 차단 또는 축소

### P1

- 홈 recent 실제 데이터 연결
- 마이페이지 실데이터 연결
- 공유 결과물 품질 개선
- 카드 비교, 재분석, 재시도 UX 개선

### P2

- 트렌드 피드 실데이터화
- 저장/찜/콜렉션
- 개인화 설정 세분화
- 실험용 모션, 마이크로인터랙션 고도화

---

## 4. 화면별 진단

## 4.1 Splash / Onboarding / Login

관련 파일:
- `src/components/Splash.jsx`
- `src/components/Onboarding.jsx`
- `src/components/Login.jsx`
- `src/contexts/AuthContext.jsx`

현재 상태

- splash는 진입 장면 역할만 한다.
- onboarding은 로컬 플래그 중심이다.
- login은 OAuth/게스트/guest_gate를 한 컴포넌트로 처리한다.

문제

- 로그인 자체보다 "왜 지금 로그인이 필요한지"가 늦게 설명된다.
- `guest_gate`는 기능 제한 안내로는 맞지만, 진입 맥락별 차등 설명이 없다.
- 로그인 성공 후 어디로 복귀하는지 명시적이지 않다.

개선 방향

- 로그인은 "계정 생성"이 아니라 "결과 보관/잠금 해제/기기 간 복원" 가치 제안으로 재정의한다.
- guest gate 문구를 진입 맥락별로 분기한다.
  - 히스토리 진입 시: "지난 분석 다시 보기"
  - 마이페이지 진입 시: "내 퍼스널 컬러와 활동 관리"
  - 잠금/합성 진입 시: "결과 저장 후 계속 보기"
- OAuth 후 복귀 target을 명시적으로 기억한다.

실행 작업

- `AuthContext`에 `postLoginTarget` 개념 추가
- `Login.jsx`를 `mode` 외에 `reason` 기반 문구로 분기
- splash에서 세션 복원, 딥링크 처리, guest 상태 복원을 한 번 정리

---

## 4.2 Home

관련 파일:
- `src/components/Home.jsx`

현재 상태

- 홈은 분석 진입 CTA가 강하고, 4개 탐색 타일과 recent 섹션이 있다.

문제

- 상단 menu / notifications 버튼은 현재 죽어 있다.
- `STYLES` 타일이 실제로는 `ANALYZE`와 같은 행동으로 연결된다.
- recent는 mock이며 클릭 의미가 약하다.
- 홈이 "분석 시작"과 "탐색"을 동시에 하려다 둘 다 얕다.

개선 방향

- v1.0에서는 홈의 역할을 명확히 하나로 잡는다: **새 분석 시작 + 최근 이어보기**.
- dead action은 제거하거나 숨긴다.
- `STYLES` 타일은 분석 결과가 없는 상태에서 의미가 약하므로 축소한다.
- recent는 실제 히스토리 1~3개를 붙여서 "다시 보기" 성격을 강화한다.

권장 구조

1. Hero: 새 분석 시작
2. Continue: 최근 분석 1~3개
3. Secondary nav: 히스토리 / 트렌드 / 마이

실행 작업

- `Home.jsx`에서 recent mock 제거
- `fetchHistory()`를 홈에서도 사용
- menu / notifications 버튼은 Phase 4 범위 밖이면 숨김

---

## 4.3 Photo Upload

관련 파일:
- `src/components/PhotoUpload.jsx`

현재 상태

- 촬영 가이드, 미리보기, camera/gallery 분기, consent 체크, 크기 제한이 있다.

강점

- 촬영 가이드를 화면 내부에서 바로 보여준다.
- 업로드 전 동의 체크를 강제하는 구조는 명확하다.

문제

- 업로드 영역, camera 버튼, gallery 버튼, NEXT 버튼이 동시에 보여서 주 행동이 분산된다.
- 가이드가 좋은데, 사용자가 실제로 "이 사진이 분석에 적합한지" 확신을 받는 장치가 부족하다.
- consent의 의미는 중요하지만 지금은 폼 검증처럼 느껴진다.

개선 방향

- 업로드 전 상태와 업로드 후 상태를 더 강하게 구분한다.
- 업로드 전:
  - "정면 사진 선택" 1차 CTA
  - 가이드는 접히지 않더라도 정보 밀도를 낮춘다.
- 업로드 후:
  - "사진 교체"와 "다음"만 남긴다.
- consent는 체크박스 자체보다 "분석 직후 삭제 / 학습 미사용" 신뢰 배지로 앞당겨 보여준다.

실행 작업

- preview가 생긴 뒤 hero 문구, 버튼 셋, 보조 카피를 전환
- 가이드 썸네일 아래에 "좋은 사진 기준 3개"를 한 줄 요약으로 추가
- NEXT 비활성 상태에 의존하지 말고, 부족한 조건을 버튼 근처에 직접 노출

---

## 4.4 Personal Color

관련 파일:
- `src/components/PersonalColor.jsx`

현재 상태

- 4계절 선택과 skip이 있다.

문제

- 분석 직전 보조 입력 화면치고는 별도 화면 비용이 크다.
- 선택/미선택의 효용 차이가 충분히 설명되지 않는다.

개선 방향

- v1.0 기준으로는 유지 가능하다. 다만 독립 화면보다 "업로드 하단 보조 질문"으로 낮출 수 있다.
- Phase 4에서는 구조 개편 전까지는 유지하되, 문장을 더 단순하게 만든다.

권장 문구 방향

- "알고 있으면 더 정확해져요"
- "모르면 건너뛰어도 괜찮아요"

추가 제안

- 장기적으로는 업로드 화면 안의 segmented choice로 흡수하는 편이 낫다.

---

## 4.5 Loading / Error

관련 파일:
- `src/components/Loading.jsx`
- `src/components/ErrorScreen.jsx`

현재 상태

- 로딩은 step 기반 진행 UI가 있고, 에러는 face/network로 분리된다.

강점

- 단순 spinner보다 낫다.
- 사용자가 지금 무엇을 기다리는지 설명한다.

문제

- 로딩 단계명이 실제 백엔드 상태와 느슨하게만 맞는다.
- cancel 후 어디로 가는지는 맞지만, 취소의 비용 설명이 없다.
- 네트워크 에러 retry는 현재 문맥을 충분히 복원하지 못한다.

개선 방향

- 로딩 단계는 "기술 단계"보다 "사용자 의미 단계"로 바꾼다.
  - 얼굴 구조 확인
  - 어울리는 분위기 정리
  - 추천 카드 만드는 중
- error 화면은 원인과 다음 행동을 1:1로 매칭한다.
- retry 시 마지막 액션을 명시적으로 기억한다.

실행 작업

- `App.jsx`에 `lastFailedAction` 도입
- `ErrorScreen`에 type별 CTA 문구/도움말 정리
- 분석 실패와 카드 생성 실패를 하나의 네트워크 오류 화면으로만 처리하지 않기

---

## 4.6 Analysis Result

관련 파일:
- `src/components/AnalysisResult.jsx`

현재 상태

- 결과 히어로, mood keys, top features, hair/makeup CTA가 있다.

강점

- "결과가 나왔다"는 감정적 보상이 충분하다.
- 사진과 라벨을 크게 쓰는 방식은 공유 친화적이다.

문제

- 결과 화면의 핵심 결정은 "헤어 볼지 메이크업 볼지"인데, 두 CTA가 동등해서 망설임이 생긴다.
- `total` 카드 API는 있는데 UI에 없다.
- 현재 결과에서 "새 분석"이나 "히스토리에 저장됨" 같은 상태 피드백이 없다.
- 개인화 신뢰도 표현이 아직 단순하다.

개선 방향

- 1차 CTA를 하나로 정한다.
  - 권장안: "헤어 추천 보기"를 1차 CTA, 메이크업은 2차 CTA
- 또는 segmented control로 `헤어 | 메이크업 | 종합` 전환을 제공하되, 같은 화면에서 카드 prefetch를 붙인다.
- "분석 저장됨" 배지나 히스토리 진입 링크를 결과 상단 또는 하단에 추가한다.

실행 작업

- `AnalysisResult.jsx`에 CTA hierarchy 재설계
- `generateTotalCards()`를 쓸 계획이면 여기서부터 진입 동선을 만든다
- `styleLabel` 도입 전까지 fallback 라벨 규칙을 문서화

---

## 4.7 Card List

관련 파일:
- `src/components/CardList.jsx`

현재 상태

- 4개 카드 목록을 잘 보여준다.
- locked / free / avoid를 라벨로 분기한다.

문제

- 카드 간 비교 기준이 약하다.
- locked 카드는 정보가 지나치게 비어 있어 "왜 2위인지"가 느껴지지 않는다.
- avoid 카드의 학습 가치가 약하다.

개선 방향

- 각 카드에 최소 2개의 비교 힌트를 준다.
  - 어울리는 이유 1줄
  - 분위기 키워드 1개
- locked 카드도 제목을 숨기더라도 "타입 힌트"는 남긴다.
- avoid는 단순 경고가 아니라 "피하면 좋은 이유"를 짧게 노출한다.

실행 작업

- `mapCards()` 단계에서 list summary용 필드 정리
- `CardList.jsx`에서 row density와 metadata 계층 재정리

---

## 4.8 Hair Card Detail

관련 파일:
- `src/components/CardDetail.jsx`

현재 상태

- AI commentary, personal fit, mood board, synthesis 영역이 있다.

강점

- 상세 화면으로서 정보량은 충분하다.
- sticky CTA가 있어 하단 행동 유도가 좋다.

문제

- 정보는 많지만 "다음 행동"이 2개 이상 경쟁한다.
- synthesis 전/후 차이는 보이지만 저장, 공유, 다른 카드 비교 흐름은 약하다.
- 같은 상세 화면 안에서 reading mode와 action mode가 섞여 있다.

개선 방향

- 상단 1스크린 안에 핵심 판단 정보를 압축한다.
  - 왜 추천인지
  - 어떤 분위기인지
  - 실제로 어떻게 달라 보일지
- synthesis는 상세 하단 섹션이 아니라 독립 action block으로 취급한다.
- "다른 카드와 비교"와 "이 카드 저장/공유"를 분리한다.

실행 작업

- hero 아래 summary strip 추가
- `TRY ON` CTA를 더 명확한 행동 문구로 변경
- synthesized state에서 CTA를 `결과 공유` 또는 `다시 보기`로 조건 분기

---

## 4.9 Makeup Detail

관련 파일:
- `src/components/MakeupDetail.jsx`

현재 상태

- commentary, palette, fit, part guide, products가 있다.

문제

- 제품 추천이 아직 mock fallback 중심이다.
- 하단의 `+ 파트별 추천 상품 더보기` 버튼은 현재 연결 가치가 약하다.
- 헤어 상세보다 구조가 길고, 핵심 CTA가 늦게 나온다.

중요 이슈

- 현재 makeup detail은 정보는 길지만, "이 룩을 저장/실행하는 행동"이 상대적으로 약하다.
- 제품 블록이 실제 제휴 데이터 없이 먼저 강조되면 신뢰를 깎을 수 있다.

개선 방향

- v1.0에서는 제품 추천을 보조 섹션으로 내리고, 룩 가이드 자체를 더 전면화한다.
- 파트 가이드는 스크롤 장문보다 accordion 또는 part tab이 더 적합하다.
- 제품이 실데이터로 준비되기 전까지는 "추천 제품"보다 "찾아볼 키워드" 형태가 더 정직하다.

실행 작업

- `MakeupDetail.jsx`의 제품 영역 우선순위 하향
- part guide를 compact layout으로 변경
- recommendedProducts 실데이터가 붙기 전 UI 과장 금지

---

## 4.10 Share

관련 파일:
- `src/components/ShareCard.jsx`

현재 상태

- 공유용 카드 캡처, 저장, native share fallback이 있다.

문제

- 공유 카드는 시각적으로 깔끔하지만, 실제 상세/합성 상태를 충분히 반영하지 않는다.
- hair share의 before/after는 placeholder 중심이라 결과 품질 체감이 약하다.
- 공유 타입별 목적이 섞여 있다. 저장, SNS 공유, 링크 복사가 같은 우선순위다.

개선 방향

- 공유 템플릿은 "결과 카드형"과 "before/after 비교형" 2종으로 분리한다.
- synthesized photo가 있으면 반드시 공유 카드에 반영한다.
- 저장은 1차 CTA, 외부 공유는 2차 CTA로 둔다.

실행 작업

- `ShareCard.jsx`에서 variant 세분화
- synthesized image prop 반영
- 캡처 전용 layout과 화면용 layout 분리

---

## 4.11 History

관련 파일:
- `src/components/History.jsx`
- `src/api/backend.js`

현재 상태

- 목록 API는 붙어 있다.
- 편집 모드와 expired 상태 표시가 있다.

문제

- 항목 클릭 시 상세 진입이 없다.
- 삭제는 UI에서만 제거되고 실제 삭제가 아니다.
- `NEW ANALYSIS` 버튼이 연결되지 않았다.
- history가 제품의 핵심 가치인데 "조회만 가능한 목록"에서 멈춘다.

개선 방향

- history를 단순 아카이브가 아니라 **재방문 진입점**으로 만든다.
- 상세 진입은 Phase 4 P0다.
- expired 사진이어도 분석 요약과 카드는 다시 볼 수 있어야 한다.

실행 작업

- `GET /api/history/{analysisId}`를 쓰는 `HistoryDetail` 화면 추가
- row 클릭 시 상세 진입
- `NEW ANALYSIS`를 홈이 아닌 upload로 바로 연결
- edit/delete는 실제 서버 동작이 없으면 숨기거나 "기기에서 숨기기"로 라벨 변경

---

## 4.12 My

관련 파일:
- `src/components/My.jsx`

현재 상태

- mock 프로필, 통계, 개인 컬러, 메뉴, 계정 삭제 시트가 있다.

문제

- 실데이터가 붙지 않은 상태에서 화면 존재감이 크다.
- v1.0 사용자 입장에서 기대를 만들지만 실제 관리 기능은 적다.

개선 방향

- Phase 4에서는 "관리 허브"보다 "계정과 보관 상태"에 집중한다.
- 마이페이지의 첫 버전은 아래만 잘하면 충분하다.
  - 로그인 상태
  - 연결된 제공자
  - 내 퍼스널 컬러
  - 분석 횟수
  - 로그아웃 / 계정 삭제

실행 작업

- mock stats 제거 또는 실데이터화
- 메뉴 수 축소
- support / terms / privacy는 footer 링크로 내려도 된다

---

## 4.13 Trend

관련 파일:
- `src/components/Trend.jsx`

현재 상태

- 시각적 틀은 있으나 실데이터와 인터랙션이 없다.

판단

- v1.0 출시 기준으로는 유지 비용 대비 가치가 낮다.

권장안

- 선택지 A: Phase 4에서 숨긴다.
- 선택지 B: "준비 중" 밴드가 있는 경량 버전으로 낮춘다.

권장 결정

- v1.0에서는 숨기거나 탭 노출을 제한하는 편이 낫다.
- 홈과 결과 퍼널 완성도가 우선이다.

---

## 4.14 Ad Gate

관련 파일:
- `src/components/AdGate.jsx`

현재 상태

- 15초 mock 광고와 unlock flow가 있다.

문제

- 광고 자체는 v1.1 범위인데, 현재 UX 구조 안에는 이미 깊게 박혀 있다.
- 광고 전 가치 설명이 약하고, 광고 후 보상 감각도 단조롭다.

개선 방향

- Phase 4에서는 광고 SDK 통합보다 **광고 전후 카피와 기대 관리**를 정리한다.
- user promise를 명확히 한다.
  - "광고 시청 후 1개 카드 열람"
  - "광고 시청 후 합성 결과 1회 보기"

실행 작업

- unlock 대상, unlock 후 이동 목적지, 재시청 정책을 문서화
- 보상형 광고 UX 규칙을 컴포넌트 내부 하드코딩이 아니라 flow config로 분리

---

## 5. 구조적 문제와 리팩터링 방향

## 5.1 Stage 기반 단일 컴포넌트의 한계

현재 `App.jsx`는 빠르게 구현하기엔 적절했지만, 이제는 다음 문제가 생긴다.

- screen state와 business state가 한 파일에 엉켜 있다.
- 뒤로가기, guest gate, loading, share, ad gate가 모두 같은 레벨에서 분기된다.
- hair/makeup 흐름이 복제되기 시작했다.

권장 방향

- full router 도입까지는 아니어도 `flow state`를 구조화한다.

예시

```ts
type RootTab = 'home' | 'history' | 'my' | 'trend'

type AnalyzeFlow =
  | { screen: 'upload' }
  | { screen: 'personalColor' }
  | { screen: 'loading'; kind: 'analysis' | 'hair' | 'makeup' | 'synthesis' }
  | { screen: 'result' }
  | { screen: 'cards'; kind: 'hair' | 'makeup' | 'total' }
  | { screen: 'detail'; kind: 'hair' | 'makeup' }
  | { screen: 'share'; kind: 'hair' | 'makeup' }
```

바로 router를 넣지 않더라도 아래 두 층으로 나누면 좋다.

1. 전역 앱 쉘: 탭, 세션, back handling
2. 분석 플로우 쉘: 업로드부터 공유까지

---

## 5.2 Design System 부재

현재 장점은 토큰 파일이 있다는 점이다. 하지만 실제 컴포넌트는 inline style 비중이 매우 높다.

문제

- spacing, section density, button height, border usage가 화면별로 조금씩 다르다.
- 같은 의미의 label / body / helper text가 화면마다 다르게 렌더된다.

Phase 4 목표

- 새로운 디자인 시스템을 만드는 것이 아니라, 현재 디자인 언어를 **재사용 가능한 패턴**으로 추출한다.

우선 추출할 패턴

- page header
- hero media block
- section header
- primary / secondary / destructive button
- status badge
- empty state
- info notice
- sticky action bar

---

## 5.3 Copy System 부재

현재는 한국어/영문 label 조합이 많고, 느낌은 좋지만 기준이 약하다.

원칙

- 브랜드 톤은 유지하되, 행동 문구는 더 직설적으로 쓴다.
- 감성 문구와 행동 문구를 분리한다.

예시

- 감성 문구: 유지 가능
- CTA: 반드시 동사 중심
  - `헤어 추천 보기`
  - `메이크업 추천 보기`
  - `새 사진으로 다시 분석`
  - `결과 저장`

금지

- CTA에서 의미 없는 영문 장식만 남기는 형태
- 비활성 이유를 설명하지 않는 disabled 버튼

---

## 6. Phase 4 실행 계획

## 6.1 Workstream A - 메인 퍼널 정리

대상 파일

- `src/App.jsx`
- `src/components/Home.jsx`
- `src/components/PhotoUpload.jsx`
- `src/components/PersonalColor.jsx`
- `src/components/AnalysisResult.jsx`
- `src/components/CardList.jsx`
- `src/components/CardDetail.jsx`
- `src/components/MakeupDetail.jsx`

작업

- CTA hierarchy 통일
- 새 분석 / 다시 보기 / 공유 / 합성 보기 우선순위 정리
- result -> cards -> detail 반복 이동 개선

완료 기준

- 첫 분석 기준 1회차 사용자가 막히는 지점이 없다
- 각 화면의 primary action이 하나로 읽힌다

## 6.2 Workstream B - 인증/게스트/잠금 규칙 정리

대상 파일

- `src/contexts/AuthContext.jsx`
- `src/components/Login.jsx`
- `src/components/AdGate.jsx`

작업

- guest gate reason 분기
- post-login return 명시화
- unlock 규칙 카피와 이동 규칙 정리

완료 기준

- 사용자가 "왜 로그인해야 하는지"를 1문장으로 이해한다

## 6.3 Workstream C - 히스토리 사용성 완성

대상 파일

- `src/components/History.jsx`
- `src/api/backend.js`
- 신규 `src/components/HistoryDetail.jsx`

작업

- 목록 -> 상세 연결
- expired/photo missing 상태에서도 읽을 정보 구조 설계
- 새 분석 CTA 연결

완료 기준

- 히스토리 탭이 실제 재방문 가치가 있는 화면이 된다

## 6.4 Workstream D - 마이페이지 축소 또는 실데이터화

대상 파일

- `src/components/My.jsx`

작업

- mock 정보 축소
- 세션/퍼스널컬러/기본 통계만 남기기

완료 기준

- 빈 약속이 많은 화면이 아니라 실제 관리 화면처럼 보인다

## 6.5 Workstream E - 공유 결과물 개선

대상 파일

- `src/components/ShareCard.jsx`

작업

- synthesized image 반영
- 저장용/공유용 템플릿 분리
- before/after 품질 향상

완료 기준

- 공유 이미지가 실제 결과를 반영한다

---

## 7. 권장 구현 순서

1. `History` 상세 진입 추가 (`완료`)
2. `Home` recent 실데이터 연결 (`완료`)
3. `Login` / guest gate 문구와 복귀 흐름 정리 (`완료`)
4. `AnalysisResult` CTA 구조 재정리
5. `CardDetail` / `MakeupDetail` action hierarchy 정리
6. `Trend` 숨김 또는 준비중 처리
7. `My` mock 축소
8. `ShareCard` 품질 개선

이 순서가 좋은 이유는, 사용자의 메인 가치인 "분석 -> 저장 -> 재방문"을 먼저 닫을 수 있기 때문이다.

---

## 8. 비범위

Phase 4에서 하지 않는 것

- 광고 SDK 실제 통합
- 추천 상품 제휴 운영 자동화
- 트렌드 CMS 구축
- 완전한 라우터 재작성
- 새 브랜드 비주얼 리뉴얼

---

## 9. 저장소/구현 기준 체크리스트

> 위 체크는 **현재 코드와 문서 기준으로 판정한 상태**다.
> 실제 사용 흐름에서 감각을 확인해야 하는 항목은 아래 `9.1 지금 사용자가 직접 체크해야 하는 것`에서 따로 체크한다.

- [x] 홈 recent가 실제 히스토리를 반영한다
- [ ] dead button이 없다
- [ ] result 화면의 primary CTA가 하나로 읽힌다
- [ ] hair / makeup 상세의 sticky CTA 목적이 분명하다
- [x] history row 클릭 시 상세 진입이 된다
- [x] guest gate가 진입 이유별로 다른 문구를 보여준다
- [ ] share 카드가 실제 결과 이미지를 반영한다
- [ ] trend 탭은 실데이터가 없으면 노출을 줄인다
- [ ] my 페이지는 mock 과장이 줄어든다
- [ ] 주요 empty / error / loading 상태 문구가 통일된다

### 9.1 지금 사용자가 직접 체크해야 하는 것

- [ ] `Trend` 화면의 search 버튼, `My` 화면의 settings 버튼, `MakeupDetail` 의 `+ 파트별 추천 제품 더보기` 버튼이 실제 동작이 없는 상태인지 확인하고 숨길지 연결할지 결정
- [ ] 홈 recent 카드에서 상세 진입 후 뒤로가기 시 `home` 으로 복귀하는지 실기기/브라우저에서 확인
- [ ] 히스토리 목록에서 상세 진입 후 뒤로가기 시 `history` 로 복귀하는지 확인
- [ ] guest 상태에서 `history`, `my`, 홈 recent 관련 진입 시 reason 맞는 gate 카피가 나오는지 확인
- [ ] 로그인 직후 원래 보려던 탭 또는 기록 상세로 정확히 복귀하는지 확인
- [ ] 저장된 헤어 카드를 히스토리 상세에서 다시 열고 `TRY ON` 이 같은 분석 기준으로 동작하는지 확인
- [ ] `AnalysisResult` 에서 사용자가 hair 와 makeup 중 어디를 먼저 눌러야 하는지 망설이지 않는지 직접 써보고 판단
- [ ] `CardDetail` / `MakeupDetail` 하단 sticky CTA 가 실제 우선순위와 맞는지 사용 흐름으로 확인
- [ ] 공유 카드가 실제 합성 결과/상세 상태를 충분히 반영하는지 확인
- [ ] 로딩/에러/empty 문구 톤이 화면별로 어색하게 섞이지 않는지 쭉 훑어보기

---

## 10. 최종 판단

현재 UI는 "디자인 시안 수준"은 이미 지났다. 반대로 "제품 UX가 정리된 상태"까지도 아직 아니다.

가장 중요한 해석은 이것이다.

- 분석 기술은 이미 사용자에게 보여줄 수 있는 수준에 들어섰다.
- 이제 문제는 시각 완성도가 아니라 **흐름 완성도**다.
- Phase 4는 새 화면을 많이 만드는 단계가 아니라, 이미 있는 화면의 역할을 줄이고 선명하게 만드는 단계여야 한다.

권장 전략은 단순하다.

1. 홈, 결과, 카드 상세, 히스토리만 강하게 만든다.
2. 트렌드와 마이는 과장하지 않는다.
3. 로그인과 잠금 규칙은 UX 문장으로 통일한다.
4. 공유 결과물은 실제 결과를 반영하게 만든다.

이 기준으로 움직이면 v1.0의 완성도는 체감상 크게 올라간다.
