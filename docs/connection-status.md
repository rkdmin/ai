# 프론트–백엔드 연결 현황

> 2026-05-12 기준. 코드 전수 점검 후 연결 가능한 항목은 같은 작업 안에서 wiring 까지 끝냈고,
> Phase 3(Supabase) 또는 별도 데이터 작업이 필요한 항목은 미연결 상태로 명시했다.

## 1. 한눈에 보기

| 영역 | 백엔드 | 프론트 클라이언트 | UI 호출 지점 | 상태 |
|------|-------|-------------------|--------------|------|
| 얼굴 분석 | `POST /api/analyze` ✅ | `analyzeFace()` ✅ | `App.startAnalysis` ✅ | **연결됨** |
| 헤어 카드 | `POST /api/cards/hair` ✅ | `generateHairCards()` ✅ | `App.startCardGeneration('hair')` ✅ | **연결됨** |
| 메이크업 카드 | `POST /api/cards/makeup` ✅ | `generateMakeupCards()` ✅ | `App.startCardGeneration('makeup')` ✅ | **연결됨** |
| 종합 카드 | `POST /api/cards/total` ✅ | `generateTotalCards()` ✅ | — ❌ | **호출자 없음** (UI에 진입점 미정) |
| 사진 합성 | `POST /api/photo/generate` ✅ | `generateStyledPhoto()` ✅ | `App.onSynthesize` ✅ (이번 작업으로 연결) | **연결됨** |
| 헬스체크 | `GET /api/health` ✅ | — | — | 운영 모니터링용 (UI 호출 불필요) |
| 분석 히스토리 저장 | `POST /api/history` ✅ + 카드 생성 시 자동 저장 ✅ | `saveHistoryCard()` ✅ | 카드 생성 플로우 ✅ | **연결됨** (Supabase 필요) |
| 분석 히스토리 조회 | `GET /api/history` ✅ / detail ✅ | `fetchHistory()` / `fetchHistoryDetail()` ✅ | `Home.jsx`, `History.jsx`, `HistoryDetail.jsx` ✅ | **연결됨** (Supabase 필요) |
| 마이페이지 프로필 | ❌ 미구현 | — | `My.jsx` (mock) | Phase 3 |
| 트렌드 피드 | ❌ 미구현 | — | `Trend.jsx` (mock) | v1.x 별도 작업 |
| 카카오/구글 로그인 | Supabase JWT 검증 ✅ | OAuth redirect bridge ✅ | `Login.jsx` ✅ | **코드 연결됨** (콘솔 설정/실기기 PoC 필요) |
| 쿠팡 상품 매핑 | ⚠️ 스키마는 있음, 미주입 | — | `MakeupDetail` (PRODUCTS_MOCK fallback) | Phase 5 (운영 데이터 + 링크 빌더) |
| `styleLabel` (감성 라벨) | ⚠️ 분석 응답 스키마 미포함 | — | `AnalysisResult`, `ShareCard` (fallback 텍스트) | Gemini 프롬프트 보강 (소규모) |
| 광고 SDK | ❌ 미구현 | — | `AdGate` (15s 타이머 mock) | v1.1 광고 정책 |
| 공유 (이미지 저장 / SNS) | — | — | `ShareCard` (no-op) | v1.x 별도 작업 |

---

## 2. 카테고리별 정리

### 2.1 ✅ 잘 연결되어 있던 흐름

이미 와이어링 되어있었고 동작에 문제가 없는 흐름.

- **사진 업로드 → 분석 → 결과 화면**
  - `PhotoUpload` → `setPhoto` → `PersonalColor` → `setPersonalColor` → `analyzeFace(photo.dataUrl)` → `Loading` → `AnalysisResult`
  - `'판정 어려움'` 응답 시 `error_face`, fetch 실패 시 `error_network` 분기까지 정상.
- **헤어/메이크업 카드 생성**
  - `AnalysisResult.onCardList(type)` → `startCardGeneration(type)` → `generateHairCards|MakeupCards(payload)` → `mappers.mapCards` → `CardList` → `CardDetail|MakeupDetail`
  - 카드 캐시(`hairCards`/`makeupCards`)에 저장 후 동일 결과는 재호출 안 함.
  - `personalColor` 한국어→백엔드 키 변환 (`backendPersonalColorKey`) 정상.
- **CORS**: `backend/main.py` 에서 `localhost:5173`, `localhost`, `capacitor://localhost` 허용.
- **에러 메시지**: 백엔드 `HTTPException.detail` 이 프론트 `http()` 클라이언트로 정상 전파.

### 2.2 🔧 이번 작업으로 연결한 흐름

#### A. **사진 합성 (`POST /api/photo/generate`)**

- **이전 상태**: 백엔드 라우트와 `generateStyledPhoto()` 클라이언트 함수까지는 있었지만, **호출자가 없었다.** `CardDetail` 의 "WATCH AD & SYNTHESIZE" 버튼은 `ad_gate` 로 이동만 하고, 광고가 끝나면 다시 `card_detail` 로 돌아올 뿐 실제 합성은 일어나지 않았다. AFTER 슬롯도 영구 잠금 상태.
- **변경**:
  1. `src/api/backend.js` — `getUserId()` 가 dev 모드에서 `localStorage('beaumi.dev_user_id')` 로 stable 가짜 user id 발급. (photo 라우트는 `require_user` 라 게스트 401)
  2. `src/App.jsx` — `synthByKey` 상태 추가, `onSynthesize(card)` 가 `generateStyledPhoto` task 를 만들고 `ad_gate` 로 이동. 광고 종료 → `synth_loading` (`Loading.jsx` 재사용) → 성공하면 `synthByKey[cardKey]` 에 저장 후 `card_detail` 로.
  3. `src/components/CardDetail.jsx` — `synthesizedPhoto` prop 추가. AFTER 슬롯이 합성된 이미지가 있으면 표시, 없으면 기존 잠금 placeholder.
- **메이크업 카드는 정책상 합성 미지원** — `card.cardType === 'makeup'` 이면 `onSynthesize` 가 동작하지 않는다 (`MakeupDetail` 은 합성 버튼 자체가 없음).
- **rate limit**: photo 스코프는 로그인 5회/일. dev 가짜 user id 도 카운팅 대상이지만 서버 재시작하면 초기화. 필요하면 backend `.env` 에 `RATE_LIMIT_DISABLED=true` 추가.

### 2.3 🔧 Phase 3 코드 연결 — Supabase Auth/History

Supabase 콘솔 설정과 SQL 적용이 끝나면 동작하는 코드 경로까지 연결했다.

- **인증**
  - 프론트: `src/contexts/AuthContext.jsx`, `src/utils/authBridge.js`
  - OAuth 버튼은 Supabase `/auth/v1/authorize` 로 이동하고, redirect hash 의 access token 을 localStorage 세션으로 저장한다.
  - `guest_gate` 에서 로그인한 경우 `post-login return target` 을 소비해 원래 탭/기록 상세로 복귀한다.
  - API 클라이언트는 `Authorization: Bearer <token>` 을 자동 첨부한다.
  - 백엔드: `middleware/auth.py` 가 Supabase `/auth/v1/user` 로 토큰을 검증한다.
- **히스토리**
  - `Home.jsx`: 로그인 사용자만 `fetchHistory(3)` 로 recent 를 가져오고, 게스트는 보호된 fetch 를 하지 않는다.
  - `POST /api/analyze`: 로그인 유저는 `analyses` INSERT 후 `analysisId` 반환, 정면 사진은 Storage 90일 보관.
  - `POST /api/cards/{hair|makeup|total}`: `analysisId` 가 있으면 생성 카드 배열을 `cards` 에 저장.
  - `GET /api/history`: 최근 5건 조회.
  - `GET /api/history/{analysisId}`: 분석/카드/생성 사진 상세 조회.
  - `HistoryDetail.jsx`: 저장된 헤어/메이크업 카드 세트를 현재 카드 UI로 다시 열고 `analysisId` 를 복원한다.
  - `POST /api/photo/generate`: `(analysisId, cardType)` 생성 사진 캐시를 확인하고 저장한다.
- **Supabase 스키마**
  - `backend/supabase_schema.sql` 에 `analyses`, `cards`, `feedback`, `usage_counters`, `generated_photos` 와 RLS 정책을 추가했다.

남은 외부 작업:

- Supabase SQL Editor에서 `backend/supabase_schema.sql` 적용
- Storage bucket `analysis-photos` 생성
- Kakao/Google OAuth provider와 redirect URL 등록
- Android 실기기 카카오 PoC: 앱 설치/미설치/백그라운드 복귀 케이스

아직 남은 Phase 3 범위:

- **`My.jsx`** — 닉네임/연동/통계/퍼스널컬러 mock. `// TODO: 프로필을 Supabase 세션에서 로드`.
  필요 작업: 프로필 schema, `GET /api/me`, 통계 집계 쿼리.
- **`usage_counters` DB 집계** — 테이블은 추가했지만 런타임 rate limit 은 아직 인메모리 카운터를 사용한다.

### 2.4 ⏳ 백엔드 미구현 — 별도 작업

#### A. **`Trend.jsx`** — 트렌드 피드
- 백엔드 라우트, 큐레이션 데이터 모두 없음.
- v1.x 에서 정적 큐레이션 JSON 을 `/api/trend` 로 노출하거나 Supabase `posts` 테이블 도입.

#### B. **메이크업 추천 제품 (`recommendedProducts`)**
- 스키마(CLAUDE.md)에는 있으나 백엔드 카드 응답이 채우지 않음 (`MAKEUP_CARDS_FORMAT` 에 필드 없음).
- 프론트 `MakeupDetail` 은 `PRODUCTS_MOCK` fallback 사용.
- 필요 작업: 카드 무드/퍼스널컬러 → 검색 키워드 매핑 테이블, 쿠팡파트너스 링크 빌더(또는 운영 매핑 데이터). 백엔드 `gemini_service.generate_makeup_cards` 후처리에 추가.

#### C. **`styleLabel` (감성 라벨)**
- 분석 응답에 `styleLabel`(예: "봄날의 햇살형") 필드 없음.
- 프론트 `AnalysisResult`/`ShareCard` 가 임시 라벨 사용 중.
- 필요 작업: `ANALYZE_PROMPT` 와 `AnalyzeResponse` 스키마에 `styleLabel: str` 추가.

### 2.5 ⏳ 외부 SDK 통합 작업

- **`AdGate.jsx`** — 15초 mock 타이머 + placeholder 광고 크리에이티브. AdMob/Naver 등 SDK 통합 시 `setStage('unlocked')` 트리거를 SDK 콜백으로 교체.
- **`ShareCard.jsx`** — `SAVE IMAGE` / `INSTAGRAM` / `KAKAO` / `COPY LINK` 모두 no-op. html2canvas + Web Share API + Kakao SDK 도입 필요.

---

## 3. 이번 작업 변경 파일

```
src/api/backend.js                  (~)    getUserId 가 dev 모드에서 localStorage 기반 stable id 발급
src/App.jsx                          (~)    synthByKey 상태 + onSynthesize + synth_loading 단계 추가
src/components/CardDetail.jsx        (~)    AFTER 슬롯에 synthesizedPhoto 렌더 (없으면 기존 잠금 UI)
src/contexts/AuthContext.jsx          (new)  Supabase OAuth 세션 상태
src/utils/authBridge.js               (new)  OAuth redirect/hash 처리
src/components/Login.jsx              (~)    Kakao/Google OAuth 버튼 연결
src/components/History.jsx            (~)    GET /api/history 연결
backend/services/supabase_service.py  (new)  Auth/REST/Storage helper
backend/routes/history.py             (new)  history save/list/detail API
backend/supabase_schema.sql           (new)  Supabase 테이블/RLS 스키마
package.json                         (~)    @capacitor/app, @capacitor/haptics 추가
                                            (코드는 이미 동적 import 로 사용 중이었지만 deps 누락으로
                                             Vite pre-transform 단계에서 500. 설치만으로 해결.)
docs/connection-status.md            (new)  본 문서
```

## 4. 검증 방법

1. **백엔드 health**: `curl http://localhost:8000/api/health` → `{"status":"ok"}`
2. **분석 → 카드 → 합성 플로우**:
   1. 정면 사진 업로드 → 퍼스널컬러 선택 → 분석 결과 확인
   2. "헤어 추천 받기" → 추천 카드 4장 확인
   3. 1위 카드 → "WATCH AD & SYNTHESIZE" → 15초 광고 → `synth_loading` → AFTER 슬롯에 합성 이미지 표시
   - 401 발생 시: 브라우저 콘솔에서 `localStorage.getItem('beaumi.dev_user_id')` 확인
3. **rate limit**: 동일 user id 로 6번째 photo 요청 → 429 + 한국어 에러 메시지.
