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
  "analysisId": "uuid (로그인 유저만 발급)"
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

### 얼굴 미검출 시 조기 거부 (Gemini 호출 안 함)

MediaPipe 가 얼굴을 찾지 못하면(`extract_face_ratios → None`) **Gemini 를 호출하지 않고**
`400` + `detail: "사진에서 얼굴을 찾을 수 없어요. ..."` 로 즉시 끊는다. 무료 게이트로 유료 호출을
막는 구조이며, 프론트는 `status < 500` 이므로 `error_face` 화면으로 분기한다.

단, **일러스트·3D 렌더링·마네킹은 MediaPipe 가 랜드마크를 찾아내므로 이 게이트를 통과한다.**
실사 여부 판별은 `ANALYZE_PROMPT` 의 거부 조건(Gemini)이 계속 담당한다.

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
   - 백엔드: MediaPipe → `faceRatios` (**미검출이면 여기서 400 종료 — Gemini 호출 없음**)
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
