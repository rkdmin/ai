---
paths:
  - "src/api/**"
  - "src/components/**"
  - "backend/routes/**"
  - "backend/services/**"
  - "backend/models/**"
  - "test/*.test.js"
---

# 프론트 ↔ 백엔드 계약 (스키마 + 데이터 흐름)

이 파일은 두 계층이 함께 지켜야 하는 필드 계약이다. 한쪽만 바꾸면 조용히 깨진다.

## 분석 API 응답 스키마 (`POST /api/analyze`)

```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 | 판정 어려움",
  "features": ["눈 간격 넓음", "광대 넓음"],
  "moodArchetype": ["ROMANTIC", "CLEAN", "SOFT"],
  "faceTypeReason": {
    "step1_sideLine": "곡선 — 광대 아래 옆선이 완만하게 이어짐",
    "step2_cheekbone": "아님 — 이마·턱과 폭 차이가 크지 않음",
    "step3_vertical": "약 1.15 — 1.4 미만",
    "decidedAt": 4,
    "confidence": 78
  },
  "faceRatios": { "foreheadRatio": 0.95, "jawRatio": 0.82, "...": "..." },
  "primaryMood": "SOFT",
  "moodTitle": "자연스럽고 차분한 이미지",
  "moodSummary": "곡선 윤곽과 낮은 대비가 부드러운 인상을 만든다.",
  "moodEvidence": ["곡선 윤곽", "저대비"],
  "distinctivePoint": "아몬드 눈 | null",
  "traits": ["곡선 윤곽", "저대비"],
  "hairDirection": "레이어드 컷 · 앞머리 사이드뱅",
  "makeupDirection": "소프트 글로우 룩 (SOFT MOOD)",
  "ruleVersion": 1,
  "analysisId": "uuid (로그인 유저만 발급)",
  "schemaVersion": 3
}
```

- `판정 어려움` — Gemini 가 경계형 얼굴(다이아몬드/하트, 땅콩/사각 등)에서 확신이 부족할 때 반환.
  프론트는 카드 생성 대신 `"여러 얼굴형 특징이 섞여 있어요"` 안내 카드를 보여준다.
- `features` — **0~3개.** 얼굴형과 모순되는 항목(둥근형 + `사각턱` 등)과 같은 부위의 반대 속성
  (`눈꼬리 처짐` + `눈꼬리 올라감`)은 `sanitize_analysis` 가 제거하므로 빈 배열도 정상 응답이다.
  **비었다고 프론트가 더미로 채우면 안 된다** — 분석하지 않은 특징을 진짜처럼 보여주게 된다.
  규칙: `docs/decisions/0009-analysis-consistency-rules.md`
- `moodArchetype` — 8개 키워드(`ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY`)
  중 **정확히 3개**. 단 얼굴형별 금지 무드(`face-hair.json[].moodBanned`)는 제외된다 —
  둥근형에 `SHARP` 가 오지 않는다. 3개가 안 되면 얼굴형 선호 무드로 채운다.
  퍼블리시티권 회피 정책으로 도입 — 연예인·인물 비교는 모든 응답에서 절대 금지.
- `faceTypeReason` — 얼굴형 판정 근거. **프론트는 표시하지 않는다** (진단용). DB 에도 저장하지 않는다.
  `ANALYZE_PROMPT` 가 이 필드를 `faceType` **보다 먼저** 채우게 해서 분류 우선순위 1~3번을
  실제로 밟도록 강제한다 — 결론을 먼저 뱉으면 인상만으로 답한다는 것이 골든셋에서 확인됐다.
  `step1_sideLine`/`step2_cheekbone`/`step3_vertical` 은 각각 분류 1·2·3번 검사에 대응하고,
  볼 수 없으면 `"관찰 불가"` 가 들어간다. `decidedAt` 은 결정된 단계(1~4), `confidence` 는 0~100.
  선택 필드라 없어도 스키마를 통과한다. 배경: `docs/decisions/0009-analysis-consistency-rules.md`
- `faceRatios` — MediaPipe 계산값. 디버깅·골든셋 회귀 비교용. **프론트는 표시하지 않는다.**
- `analysisId` — 로그인 유저에게만 발급. 카드 저장(`POST /api/history`)과
  사진 생성(`POST /api/photo/generate`)에 사용된다.
- `schemaVersion` — 분석 결과 JSON 의 모양 버전 (`backend/models/schemas.py` 의 `ANALYSIS_SCHEMA_VERSION`, 현재 3).
  로그인 유저는 응답 전체가 `analyses.result` 에 같은 버전으로 저장된다.

### 대표 무드 · Traits (D01, schema v3 — ADR 0010 R06)

Figma 의 무료 결과 화면("Primary SOFT · Traits 곡선 윤곽 · 저대비", 제목, 근거, 방향 미리보기)을 채우는 필드다.
전부 **선택 필드**라 구버전 저장본(`legacy: true`)에는 없다. 없으면 숨기고, 더미로 채우지 않는다.

- `primaryMood` — `moodArchetype` 3개 **안의** 대표 1개. 모델이 안 주면 얼굴형 선호 무드 중 응답에 있는 첫 번째
  (`sanitize_analysis`). "3개 중 첫 원소" 가정은 그 폴백에서만 쓴다.
- `moodTitle` — 20자 안쪽 한 구절. **인물 이름·`○○ st`·"닮은" 표현은 런타임에도 걸러 `null` 로 만든다.** 빈 값이면 UI 는
  "나의 Beauty Mood" (closeout fallback).
- `moodSummary` 한 문장 · `moodEvidence` 1~3개(관찰 항목 인용) · `distinctivePoint` 또는 `null`.
- `traits` — **무드와 다른 축.** `backend/data/traits.json` 의 라벨만, 축당 1개·전체 0~2개.
  축: 윤곽(`곡선 윤곽`/`직선 윤곽`) · 비율(`세로 긴 비율`/`가로 넓은 비율`) · 대비(`고대비`/`저대비`).
  얼굴형과 모순되는 라벨(사각형 + `곡선 윤곽`)과 판정 근거와 어긋나는 라벨은 `sanitize_analysis` 가 버린다.
  0개면 UI 는 Traits 행을 숨긴다 (closeout 규칙).
- `hairDirection` / `makeupDirection` — **AI 가 아니라 RAG 에서 결정적으로 뽑는다** (`free_directions`).
  헤어는 얼굴형 priority 1 스타일, 메이크업은 대표 무드가 제목에 든 카드. 같은 입력이면 항상 같은 문장.
  `판정 어려움` 이면 `null`.
- `ruleVersion` — `traits.json` 의 `ruleVersion`. 사전이 바뀌면 올라간다. 케미 계산(D08)도 이 버전을 참조할 예정.

### 저장된 분석 다시 읽기 — legacy (`GET /api/history/{id}` · `GET /api/history`)

`analysis` 에 `schemaVersion` 과 `legacy` 가 붙는다. **`legacy: true` 는 현재 버전보다 낮은 저장본**이다.
v1(2026-10 이전)은 `moodArchetype` 이 빈 배열, v2 는 무드는 있지만 `primaryMood`·`traits` 가 없다.
백엔드는 없는 값을 채우지 않는다 — 분석하지 않은 값을 분석 결과처럼 보이게 하지 않기 위해서다.
UI 는 `legacy` 를 보고 없는 블록을 숨기거나 재분석을 권한다.
adapter 는 `supabase_service.analysis_from_row` 하나다. 모양을 또 바꾸면 거기에 분기를 추가한다.
목록 항목(`HistoryListItem`)에도 `moodArchetype` / `schemaVersion` / `legacy` 가 있다.

### 에러 응답 — 코드 계약 (F03, `backend/models/errors.py`)

코드가 붙는 에러는 이 모양이다. `detail` 은 사람이 읽는 문장(기존 프론트가 그대로 씀), `code` 로 화면을 분기한다.
**문자열 매칭으로 분기하지 마라** — 문장은 바뀐다, 코드는 안 바뀐다.

```json
{ "detail": "사진에 얼굴이 여러 개 보여요. ...", "code": "MULTIPLE_FACES" }
```

| code | status | 뜻 | 화면 |
|---|---|---|---|
| `INVALID_IMAGE` | 400 | 이미지로 읽히지 않음 | 사진 다시 선택 |
| `NO_FACE` | 400 | MediaPipe 가 얼굴을 못 찾음 | 얼굴 없음 안내 + 가이드 재열기 |
| `MULTIPLE_FACES` | 400 | 얼굴 2개 이상. 자동 선택 안 함 | 여러 얼굴 안내 |
| `FACE_TOO_SMALL` | 400 | 광대 폭이 이미지 폭의 12% 미만 또는 96px 미만 | 더 가까이 찍기 안내 |
| `UNSUPPORTED_PHOTO` | 400 | **Gemini 가 거부** (일러스트·측면·가림 등). 사유는 `detail` | 실사 정면 안내 |
| `RATE_LIMITED` | 429 | 일일 한도 | 내일 다시 |
| `AI_UNAVAILABLE` | 503 | 모델 과부하·일시 장애 | 재시도 |
| `AI_ERROR` | 400/502 | 그 외 모델 실패 | 재시도 |

앞의 네 개는 **Gemini 호출 전** MediaPipe 에서 끊는다 (무료 게이트). 일러스트·3D·마네킹은 랜드마크가
잡혀 통과하고 `ANALYZE_PROMPT` 의 거부 조건이 `UNSUPPORTED_PHOTO` 로 잡는다.
`판정 어려움` 은 에러가 아니라 **200 응답의 `faceType` 값**이다 — 결과 화면이 처리한다.
코드 없는 `HTTPException` (400 입력 검증 등)은 `code` 가 없다. 그땐 `detail` 만 보여준다.

### 샘플 결과 fixture (D07) — 홈 "전체 결과 예시 보기"

`src/data/sample-result.json`. `POST /api/analyze` 응답과 **같은 모양**(schemaVersion 3)에 `isSample: true` 가 붙어 있다.
네트워크·AI 호출 없이 바텀시트(Figma `108:2659`)를 채우는 용도다.

- UI 는 `isSample` 을 보고 "예시" 라벨을 붙이고, **어디에도 저장하지 않는다** (히스토리·기기 보관본 금지).
- 인물 사진은 없다. 비주얼은 `Placeholders.jsx` 의 `FacePlaceholder`. 내부 평가 사진(`src/data/test/`)을 쓰지 않는다.
- `backend/test_phase3.py` 가 이 파일을 `AnalyzeResponse` 와 `sanitize_analysis` 로 검증한다. 모양이 바뀌면 거기서 깨진다.
- `VITE_MOCK=true` 의 `mock.analyzeFace` 도 이 fixture 를 돌려준다 — mock 과 샘플이 한 소스다.

### 사진 보관 정책 — 안내 문구는 코드가 아니라 이 값을 보여준다

- `POST /api/analyze` 응답의 `photoRetentionDays` / `photoExpiresAt`. 게스트는 서버에 사진을 저장하지 않으므로
  `photoExpiresAt: null`. 로그인 사용자는 `PHOTO_RETENTION_DAYS`(기본 90) 뒤 만료.
- `GET /api/account/policy` → `{ photoRetentionDays, generatedPhotoRetentionDays, guestPhotoStored: false }`.
  **UI 카피("즉시 폐기", "90일 보관")는 이 값을 읽어 만든다.** 숫자를 화면에 박지 않는다 — 지금 `PhotoUpload` 의
  "분석 즉시 폐기" 문구는 로그인 사용자에겐 거짓이다 (코드 불일치, plan 0009 P1).
- 만료 시각 기록과 실제 파일 삭제는 별개다. 만료 후 파일을 지우는 작업은 아직 없다 (F12, R16).

### 계정 삭제 (`DELETE /api/account`) — 로그인 전용

분석·카드·피드백·생성 사진 행, Storage 의 정면·생성 사진, 사용량 카운터, auth 사용자를 지운다.

```json
{ "ok": true, "storageDeleted": 4, "analysesDeleted": true, "authUserDeleted": true, "errors": [] }
```

- **부분 실패도 200** 이다. `ok=false` 면 `errors` 에 남은 단계가 적혀 있고, **다시 호출하면 남은 것만 지운다** (멱등).
  UI 는 `ok=false` 일 때 "일부가 남았어요. 다시 시도" 를 보여준다. 지금 `My.jsx` 의 alert 는 이 호출로 바꿔야 한다.
- 게스트는 401. 게스트의 기기 저장본 삭제는 프론트가 한다 (서버에 없다).
- 거래 원장(구매 기록)은 아직 테이블이 없다. 생기면 삭제가 아니라 익명화 대상이다 (F12 보관 설계).

### 사진 사전검사 (`POST /api/photos/validate`) — Gemini 없음

Figma 의 "선택 사진 확인" 화면용. 요청 `{ "image": "<data URL>" }`, 응답:

```json
{
  "ok": false, "code": "NO_FACE", "message": "사진에서 얼굴을 찾을 수 없어요. ...",
  "checks": { "imageDecoded": true, "faceDetected": false, "singleFace": false, "faceLargeEnough": false },
  "faceCount": 0
}
```

- 검사 실패도 **200** 이다. 에러가 아니라 검사 결과다. `ok=false` 면 `code` 가 위 표의 사진 코드다.
- `checks` 는 **검사한 항목만** 말한다. 실사 여부는 검사하지 않으므로 `ok=true` 가 "분석 보장" 이 아니다.
  UI 에 "분석 가능" 체크를 켤 때는 이 한계를 카피에 반영한다 (예: "얼굴 확인됨" 까지만).
- 한도: 게스트 5/일, 로그인 20/일. 분석(`/api/analyze`)과 별도 카운터.
- 같은 이미지를 바로 `/api/analyze` 에 보내면 MediaPipe 검사를 한 번 더 돈다. 검사 ID 재사용은 아직 없다.

## 통합 Beauty Report (`/api/reports`, F04) — 로그인 전용

리포트 = **구매 시점 분석 snapshot** + Hair 카드 + Makeup 카드 (ADR 0010 R01). 재분석해도 바뀌지 않는다.

| 동작 | 주소 | 비고 |
|---|---|---|
| 만들기 | `POST /api/reports` `{ analysisId }` | 같은 분석이면 기존 리포트 반환 (멱등). 두 탭을 동기 생성 (10~20초) |
| 목록 | `GET /api/reports` | 권한 없으면 `locked: true` + 본문 없음 |
| 하나 | `GET /api/reports/{id}` | 남의 것은 `404 NOT_FOUND` (존재 여부를 알리지 않는다) |
| 재시도 | `POST /api/reports/{id}/retry` | **실패한 탭만** 다시 만든다. 성공한 탭은 재생성하지 않는다 |

```json
{ "id": "uuid", "analysisId": "uuid", "status": "ready", "locked": false,
  "analysis": { "faceType": "계란형", "primaryMood": "SOFT", "moodTitle": "...", "traits": ["곡선 윤곽"], "personalColor": null, "schemaVersion": 3 },
  "hair": [ "...HAIR_CARDS_FORMAT 카드 4장..." ], "makeup": [ "...MAKEUP_CARDS_FORMAT 카드 4장..." ],
  "hairError": null, "makeupError": null, "createdAt": "...", "updatedAt": "..." }
```

- `status`: `not_started | generating | ready | partial_failed | failed`. `partial_failed` 면 한 탭만 있고 다른 탭의 `*Error` 에 사유.
  UI 는 재결제가 아니라 **재시도 버튼**을 보여준다.
- **권한**: 결제(P4) 전까지 `REPORT_ACCESS_MODE` 가 정한다. `entitlement`(기본)는 항상 403 `REPORT_ACCESS_REQUIRED`,
  `open` 은 로그인만으로 허용 (로컬·테스트). P4 가 끝나면 `report_service.has_access()` 가 `entitlements` 를 조회한다.
- **권한이 사라지면(환불 등) 본문을 내려주지 않는다** — `locked: true`, `hair`/`makeup` 은 `null`, `analysis` 요약만.
- 리포트 본문은 지금 기존 카드 포맷(HAIR/MAKEUP_CARDS_FORMAT) 그대로다. Figma 의 "길이·볼륨·미용실 문장·부위별 근거"는
  D02·D03 RAG 확장 후 포맷이 넓어진다. 필드가 **추가**되지 제거되진 않는다.
- Hair 탭 상세의 TRY ON(`/api/photo/generate`)은 아직 리포트 권한과 연결되지 않았다 (F06).

## 카드 공통 필드

```json
{
  "moodLabel": "ROMANTIC · 우아한 분위기"
}
```

- `moodLabel` — 무드 아키타입 키워드 + 한국어 분위기 (예: `ELEGANT · 우아한 분위기`).
  `rag_service.py` 의 `HAIR_CARDS_FORMAT` / `MAKEUP_CARDS_FORMAT` 에 정의되어 있고
  `gemini_service.py` 가 **얼굴형별 허용 무드**(`mood_allowed`) 준수를 프롬프트로 강제한다.
  8개 전체가 아니라 금지 무드를 뺀 목록이 프롬프트에 들어간다. **구현됨.**

> ⚠️ **`styleLabel` 은 아직 없다.** 백엔드 스키마·프롬프트·카드 포맷 어디에도 없다.
> 프론트(`AnalysisResult`, `ShareCard`)가 fallback 텍스트로 때우고 있다.
> 도입하려면 `ANALYZE_PROMPT` 와 `AnalyzeResponse` 양쪽을 함께 손봐야 한다.
> 이 파일에 "있는 필드"로 적지 않는다 — 없는 필드를 계약으로 오해하면 프론트가 헛되게 참조한다.

> **`celebrityMatch` 류 연예인 비교 필드는 전면 금지** — 인물 이름·`○○ st`·look-alike 표현 금지.
> 저장 시점에 `.claude/hooks/check-file.mjs` 가 차단한다.

## 메이크업 카드 실제 필드 (구현됨)

`MAKEUP_CARDS_FORMAT` 이 정의하는 것: `mood` / `moodLabel` / `emoji` / `baseSkin` /
`makeup.{shading,highlight,blush,eyebrow,lip,eyeshadow,eyeliner}` (+ 각 `*Reason`) /
`featureTip` / `coachComment`.

퍼스널컬러가 없으면 `eyeshadow` · `eyeliner` 와 그 `Reason` 은 `null` 이다.

## 메이크업 추천 제품 — **미구현 (계획 스키마)**

> ⚠️ 아래는 **아직 백엔드가 채우지 않는다.** `MAKEUP_CARDS_FORMAT` 에 `recommendedProducts`
> 필드가 없다. 프론트 `MakeupDetail` 은 `PRODUCTS_MOCK` fallback 을 쓰고 있고,
> `coupangPartnersUrl` 이 있는 항목이 하나도 없으면 구매 affordance 와 제휴 고지를 숨긴다.
> 도입 시점은 Phase 5 (`docs/decisions/0007-phase5-monetization.md`).

```json
{
  "recommendedProducts": [
    {
      "slot": "lip | blush | eyeshadow | base",
      "label": "봄웜 코랄 립틴트",
      "searchKeyword": "봄웜 코랄 립틴트",
      "coupangPartnersUrl": "https://link.coupang.com/..."
    }
  ]
}
```

- `recommendedProducts` — 메이크업 카드 상세 하단 상품 블록용. 초기 범위는 추천 카드 기준 2~4개
- `searchKeyword` — 퍼스널컬러 + 메이크업 파트 기반 추천 키워드.
  **AI 가 자유 생성하지 않고** RAG/후처리 규칙에 맞춰 구성한다.
- `coupangPartnersUrl` — 쿠팡파트너스 링크. **AI 가 직접 생성하지 않고** 별도 상품 매핑 또는
  운영 데이터에서 주입한다. 노출 시 파트너스 고지 문구를 함께 띄운다.
  링크 열기 자체는 `src/utils/external.js` 로 이미 연결되어 있다 (시스템 브라우저 + 웹 폴백).

## 주요 데이터 흐름

1. `Home` → 새 분석 시작 또는 최근 기록 재열기
   - 로그인 사용자는 `fetchHistory(3)` 로 recent 1~3개를 본다
   - 게스트는 recent API 를 호출하지 않고 로그인 유도 카피만 본다
2. `PhotoUpload` → 정면 사진 1장 수집 (프론트)
3. 프론트가 `POST /api/analyze` 호출 (`src/api/backend.js`)
   - 백엔드: MediaPipe → `faceRatios` (**얼굴 없음·여러 명·너무 작음이면 여기서 400 + code — Gemini 호출 없음**)
   - 백엔드: Gemini 2.5 Flash → `{ faceType, features, moodArchetype, faceRatios, analysisId? }`
4. `PersonalColor` → 퍼스널컬러 선택 후 분석 시작
5. 프론트가 `POST /api/cards/{hair|makeup|total}` 호출
   - 백엔드: `rag_service.build_*_context` → Gemini → 카드 4장 생성
6. 카드 선택 시 → `CardDetail` / `MakeupDetail` 진입
   - 메이크업 카드: `recommendedProducts` + 쿠팡파트너스 링크 + 고지 문구 (사진 생성 미지원)
   - 헤어/종합 추천 카드: `POST /api/photo/generate` (로그인 전용) → Gemini → data URL
7. `History` / `HistoryDetail`
   - `GET /api/history` → 최근 5회 목록
   - `GET /api/history/{analysisId}` → 저장된 분석/카드/생성 사진 조회
   - `HistoryDetail` 에서 저장된 헤어/메이크업 카드를 다시 열 때 `analysisId` 를 카드에 복원해
     TRY ON 재사용 가능

## 사진 업로드 구조

| 슬롯 | 필수 여부 | 설명 |
|------|----------|------|
| 정면 사진 | 필수 | 분석 기준 이미지 (1장) |

v1.0 은 정면 1장만 받는다. 측면(90도·45도)은 v1.x 이후 검토 — Gemini 가 측면을 얼마나 잘
활용하는지 데이터로 확인된 뒤에 재도입한다. (배경: `docs/decisions/0002-phase1-face-accuracy-rag.md` 1-3)

## 현재 미연결 영역

- `MakeupDetail` 의 상품 블록 — `recommendedProducts` 미구현 (위 참조), `PRODUCTS_MOCK` fallback
- `Trend.jsx` — 백엔드 라우트·큐레이션 데이터 없음. mock 피드 대신 "준비 중" 화면만 노출
- `My.jsx` 통계 — 세션 JWT 의 email/provider 는 실데이터이나 분석 횟수 등 통계는 없음 (`GET /api/me` 미구현)
- `styleLabel` — 위 참조
- `POST /api/cards/total` — 백엔드·클라이언트는 있지만 **UI 호출자가 없다** (v1.0 진입점 미정)

정확한 최신 현황은 `docs/connection-status.md` 를 먼저 확인한다.
