---
last-verified: "2026-08-12"
---

# 프론트–백엔드 연결 현황

> 이 문서는 "지금 무엇이 붙어 있고 무엇이 안 붙어 있나"만 담는다. 기준일은 위 `last-verified`.
> 언제 누가 무엇을 연결했는지는 여기서 다루지 않는다 — 그건 `docs/decisions/` 와 git 이력의 몫이다.
> 엔드포인트 wiring 이 바뀌면 이 문서를 같은 작업에서 갱신한다.

## 1. 한눈에 보기

| 영역 | 백엔드 | 프론트 클라이언트 | UI 호출 지점 | 상태 |
|------|-------|-------------------|--------------|------|
| 얼굴 분석 | `POST /api/analyze` ✅ | `analyzeFace()` ✅ | `App.startAnalysis` ✅ | **연결됨** |
| 헤어 카드 | `POST /api/cards/hair` ✅ | `generateHairCards()` ✅ | `App.startCardGeneration('hair')` ✅ | **연결됨** |
| 메이크업 카드 | `POST /api/cards/makeup` ✅ | `generateMakeupCards()` ✅ | `App.startCardGeneration('makeup')` ✅ | **연결됨** |
| 종합 카드 | `POST /api/cards/total` ✅ | `generateTotalCards()` ✅ | — ❌ | **호출자 없음** (v1.0 진입점 미정) |
| 사진 합성 | `POST /api/photo/generate` ✅ | `generateStyledPhoto()` ✅ | `App.onSynthesize` ✅ | **연결됨** (로그인 전용) |
| 헬스체크 | `GET /api/health` ✅ | — | — | 운영 모니터링용 (UI 호출 불필요) |
| 히스토리 저장 | `POST /api/history` ✅ + 카드 생성 시 자동 저장 ✅ | `saveHistoryCard()` ✅ | 카드 생성 플로우 ✅ | **연결됨** (Supabase 필요) |
| 히스토리 조회 | `GET /api/history` ✅ / `GET /api/history/{id}` ✅ | `fetchHistory()` / `fetchHistoryDetail()` ✅ | `Home` · `History` · `HistoryDetail` ✅ | **연결됨** (Supabase 필요) |
| 카카오/구글 로그인 | Supabase JWT 검증 ✅ | OAuth redirect bridge ✅ | `Login.jsx` ✅ | **코드 연결됨** (콘솔 설정·실기기 PoC 필요) |
| 결과 카드 공유·저장 | — | html2canvas + Filesystem + Share ✅ | `ShareCard.jsx` ✅ | **연결됨** (네이티브 + 웹 폴백) |
| 카메라 / 갤러리 | — | `@capacitor/camera` ✅ | `PhotoUpload.jsx` ✅ | **연결됨** (네이티브 + 웹 폴백) |
| 외부 링크 (쿠팡 등) | — | `src/utils/external.js` ✅ | `MakeupDetail.jsx` ✅ | **연결됨** (시스템 브라우저 + 웹 폴백) |
| 에러 트래킹 | — | `src/utils/sentry.js` ✅ | `ErrorBoundary.jsx` ✅ | **연결됨** (`VITE_SENTRY_DSN` 게이트, 없으면 no-op) |
| 마이페이지 계정 정보 | — | 세션 JWT 파싱 ✅ | `My.jsx` ✅ | **부분 연결** — email/provider 는 실데이터, 통계 없음 |
| 계정 삭제 | ❌ 미구현 | — | `My.jsx` 삭제 시트 (mock) | 클라이언트 저장분만 정리 |
| 쿠팡 상품 데이터 | ⚠️ `recommendedProducts` 미구현 | — | `MakeupDetail` (`PRODUCTS_MOCK` fallback) | Phase 5 |
| `styleLabel` (감성 라벨) | ❌ 스키마·프롬프트에 없음 | — | `AnalysisResult` · `ShareCard` (fallback 텍스트) | 프롬프트+스키마 동시 보강 필요 |
| 트렌드 피드 | ❌ 미구현 | — | `Trend.jsx` ("준비 중" 화면) | v1.x 별도 작업 |
| 광고 SDK | ❌ 미구현 | — | `AdGate` (15초 타이머 mock) | v1.1 광고 정책 |
| 프로필 API | ❌ `GET /api/me` 없음 | — | `My.jsx` 통계 영역 부재 | Phase 3 잔여 |

---

## 2. 검증된 흐름

- **업로드 → 분석 → 결과**
  `PhotoUpload` → `PersonalColor` → `analyzeFace(photo.dataUrl)` → `Loading` → `AnalysisResult`
  - MediaPipe 가 얼굴을 못 찾으면 **Gemini 호출 없이 400** → 프론트 `error_face` 분기
  - `'판정 어려움'` 응답도 `error_face`, fetch 실패는 `error_network`
- **카드 생성**
  `AnalysisResult.onCardList(type)` → `startCardGeneration(type)` → `generateHairCards|MakeupCards`
  → `mappers.mapCards` → `CardList` → `CardDetail` | `MakeupDetail`
  - 카드 캐시(`hairCards` / `makeupCards`)에 저장해 동일 결과는 재호출하지 않는다
  - `personalColor` 한국어 → 백엔드 키 변환은 `backendPersonalColorKey`
- **사진 합성**
  `CardDetail` 의 합성 버튼 → `ad_gate` → `synth_loading` → `synthByKey[cardKey]` 저장 → `card_detail`
  - **메이크업 카드는 정책상 합성 미지원** (`MakeupDetail` 에 버튼 자체가 없다)
  - photo 라우트는 `require_user` 라 게스트는 401. dev 에서는 `localStorage('beaumi.dev_user_id')` 로 stable 가짜 id 발급
- **CORS**: `backend/main.py` 가 `localhost:5173` · `localhost` · `capacitor://localhost` 허용
- **에러 전파**: 백엔드 `HTTPException.detail` 이 프론트 `http()` 클라이언트까지 전달

---

## 3. 미연결 항목별 남은 작업

### `styleLabel`
`ANALYZE_PROMPT` 와 `AnalyzeResponse` 스키마 양쪽에 추가해야 한다. 한쪽만 하면 프론트가 계속
fallback 을 쓴다. 상세는 `.claude/rules/api-contract.md`.

### `recommendedProducts` (쿠팡 상품)
`MAKEUP_CARDS_FORMAT` 에 필드가 없다. 필요 작업:
카드 무드/퍼스널컬러 → 검색 키워드 매핑 테이블, 쿠팡파트너스 링크 빌더(또는 운영 매핑 데이터),
`gemini_service.generate_makeup_cards` 후처리. **링크를 여는 경로는 이미 구현되어 있다.**

### `Trend.jsx`
백엔드 라우트와 큐레이션 데이터가 모두 없다. mock 피드를 노출하지 않고 "준비 중" 화면만 보여주는
것이 현재 정책이다 (과장 금지). v1.x 에서 정적 큐레이션 JSON 을 `/api/trend` 로 노출하거나
Supabase `posts` 테이블을 도입한다.

### `My.jsx` 통계 / 계정 삭제
세션 JWT 의 email·provider 는 실데이터다. 남은 것은 분석 횟수 등 통계(`GET /api/me` + 집계 쿼리)와
실제 계정 삭제(Supabase rpc + 백엔드 user data purge). 현재 삭제 시트는 클라이언트 저장분만 정리한다.

### `usage_counters`
테이블은 `backend/supabase_schema.sql` 에 있지만 런타임 rate limit 은 아직 인메모리 카운터
(`backend/middleware/rate_limit.py`, UTC 일자 단위)를 쓴다. 서버 재시작 시 초기화된다.

### 광고 SDK
`AdGate.jsx` 는 15초 mock 타이머 + placeholder 크리에이티브. SDK 통합 시 `setStage('unlocked')`
트리거를 SDK 콜백으로 교체한다.

---

## 4. Supabase 외부 설정 (코드 밖 작업)

코드 경로는 연결되어 있고, 아래가 끝나야 실제로 동작한다.

- Supabase SQL Editor 에서 `backend/supabase_schema.sql` 적용
  (`analyses` / `cards` / `feedback` / `usage_counters` / `generated_photos` + RLS)
- Storage bucket `analysis-photos` 생성 (정면 사진 90일 보관)
- Kakao / Google OAuth provider 와 redirect URL 등록
- Android 실기기 카카오 PoC — 앱 설치 / 미설치 / 백그라운드 복귀 케이스

절차는 `docs/auth-setup.md` 참조.

---

## 5. 검증 방법

```bash
curl http://localhost:8000/api/health     # → {"status":"ok"}
```

전체 플로우:

1. 정면 사진 업로드 → 퍼스널컬러 선택 → 분석 결과 확인
2. "헤어 추천 받기" → 추천 카드 4장 확인
3. 1위 카드 → 합성 버튼 → 15초 광고 → `synth_loading` → AFTER 슬롯에 합성 이미지
   - 401 이면 브라우저 콘솔에서 `localStorage.getItem('beaumi.dev_user_id')` 확인
4. 얼굴이 없는 사진 업로드 → **Gemini 호출 없이** 400 + `error_face` 화면
5. rate limit: 동일 user id 로 6번째 photo 요청 → 429 + 한국어 에러 메시지
   - 개발 중 우회는 `backend/.env` 에 `RATE_LIMIT_DISABLED=true`
