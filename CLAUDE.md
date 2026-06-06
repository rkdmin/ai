# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ 문서 업데이트 규칙

> **기능이 변경될 때마다 아래 모든 MD 파일을 반드시 함께 수정하세요.**
> 본 파일이 단일 진실 소스이며, `AGENTS.md`는 이 파일을 가리키는 포인터입니다.

| 파일 | 업데이트 시점 |
|------|-------------|
| `CLAUDE.md` (이 파일) | 구조·흐름·스키마·파일명 변경 시 |
| `docs/ui-flow.md` | step 추가/삭제, 컴포넌트 동작·조건·state 변경 시 |
| `docs/test.md` | 테스트 구조·품질 게이트 변경 시 |
| `docs/auth-setup.md` | Supabase/Auth/Google OAuth 콘솔 설정 변경 시 |
| `backend/data/rag_usage_guide.md` | RAG 데이터 구조·병합 규칙·우선순위 변경 시 |

변경 후 MD와 코드가 불일치하면 다음 세션에서 잘못된 컨텍스트로 작업하게 됩니다.

---

## ⚠️ 파일 인코딩 규칙 (필수)

> **모든 텍스트 파일은 반드시 `UTF-8`(BOM 없음) + `LF` 줄끝으로 저장한다.**
> 이 저장소는 한글 문자열과 `·`(가운뎃점, U+00B7) 같은 기호를 코드/테스트/문서에 직접 쓴다. 잘못된 코드페이지(CP949/EUC-KR 등)로 저장하면 `·` 가 `쨌` 같은 깨진 글자로 바뀌어 **화면에 그대로 렌더되고, 컴포넌트와 테스트가 같이 깨지면 테스트는 통과하지만 UI 만 깨지는** 사고가 난다 (2026-05 실제 발생).

지킬 것:

- 파일 저장 인코딩은 항상 **UTF-8 (no BOM)**. PowerShell 로 파일을 쓸 때는 `-Encoding utf8` 을 명시한다.
- 줄끝은 **LF**. (`.gitattributes` 의 `* text=auto eol=lf` 가 강제)
- `src/`·`test/` 에 한글/특수기호 문자열을 넣은 뒤에는 `git diff` 로 `·` 가 `쨌` 등으로 바뀌지 않았는지 확인한다.
- IDE(IntelliJ 등) 의 파일 인코딩 설정이 `UTF-8` 인지 확인한다 (Settings → Editor → File Encodings: Global/Project/Default 모두 UTF-8).
- `.gitattributes` 가 `.jsx/.js/.ts/.tsx/.css/.html/.json/.md/.py/.sql/.yml` 를 텍스트로 다루고 LF 로 정규화한다. 새 텍스트 확장자를 추가하면 여기에도 등록한다.

---

## 💄 AI 뷰티 코치

정면 사진 1장으로 얼굴형을 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장), 전문가 피드백, 메이크업 카드용 추천 제품 + 쿠팡파트너스 링크를 제공하는 AI 뷰티 코치 앱입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 (웹) | React + Vite |
| 앱 | React + Capacitor |
| 얼굴 측정 | MediaPipe (Python, 백엔드) |
| AI 분석 + 카드 생성 | Gemini 2.5 Flash (단일 통합 완료, Phase 1) |
| 이미지 생성 | Gemini 2.5 Flash (헤어/종합 카드 스타일 적용 이미지) |
| RAG 지식베이스 | JSON 파일 기반 |
| 백엔드 | Python + FastAPI |
| DB / 인증 | Supabase |
| 배포 | Vercel (웹) / Render 테스트 / Railway 운영 |

---

## 개발 서버 실행

### 프론트엔드 (웹/Capacitor 공용)

```bash
npm install
npm run dev
# → http://localhost:5173
```

루트 `.env`:
```
VITE_API_URL=http://localhost:8000  # 백엔드 주소 (필수)
VITE_MOCK=                          # true 면 백엔드 호출 없이 더미 데이터
VITE_DEV_INSPECTOR=                 # true 면 🐞 인스펙터 노출 (Phase 2 부터는 거의 빈 패널)
VITE_SUPABASE_URL=                  # Phase 3 OAuth redirect URL (https://*.supabase.co)
```

### 백엔드 (Python + FastAPI)

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                # GEMINI_API_KEY / Supabase 값 채우기
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs (Swagger UI)
```

`backend/.env`:
```
GEMINI_API_KEY=                     # 필수
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost,capacitor://localhost
SUPABASE_URL=                       # Phase 3
SUPABASE_ANON_KEY=                  # Phase 3
SUPABASE_SERVICE_ROLE_KEY=          # Phase 3
SUPABASE_PHOTO_BUCKET=analysis-photos
```

---

## 프로젝트 구조

```
src/                            # 프론트엔드 (웹/Capacitor 공용)
├── api/
│   ├── ai.js           # 프로바이더 라우터 (mock / backend 분기)
│   ├── backend.js      # FastAPI 백엔드 HTTP 클라이언트
│   └── mock.js         # 더미 데이터 (VITE_MOCK=true 시 사용)
├── components/                 # Beaumi 에디토리얼 디자인 (handoff 패키지 적용)
│   ├── Splash.jsx         # 진입 스플래시 + 세션/딥링크 복원
│   ├── Onboarding.jsx     # 3-step 온보딩 (로컬 플래그)
│   ├── Home.jsx           # 홈 랜딩 + 최근 기록 1~3개 이어보기 (로그인 사용자만 fetch)
│   ├── Login.jsx          # OAuth 로그인 + 게스트 체험 + guest gate 카피 분기
│   ├── PhotoUpload.jsx    # STEP 01 — 정면 사진 1장 + DO/DON'T 가이드 타일
│   ├── PersonalColor.jsx  # 퍼스널컬러 4계절 선택 / skip (분석 직전 보조 입력)
│   ├── Loading.jsx        # STEP 02 — 4-step 분석 로딩 (FACE DETECTION → CARD CURATION)
│   ├── ErrorScreen.jsx    # face / network 에러 화면 (type별 tip + CTA)
│   ├── AnalysisResult.jsx # STEP 02 결과 — MOOD KEYS / FEATURES / RECOMMENDATIONS
│   ├── CardList.jsx       # STEP 03 — 카드 4장 (rank1 무료 + 2·3 광고 잠금 + AVOID)
│   ├── CardDetail.jsx     # STEP 04 — AI COMMENTARY / PERSONAL FIT / MOOD BOARD / AI SYNTHESIS (헤어/종합)
│   ├── MakeupDetail.jsx   # 메이크업 카드 상세 — palette / part guide / 추천 제품 + 쿠팡 링크
│   ├── AdGate.jsx         # 15초 광고 게이트 (잠금 카드 / 사진 합성 공통)
│   ├── ShareCard.jsx      # 공유 카드 오버레이 (결과 카드형 / before·after 비교형)
│   ├── History.jsx        # 최근 5회 분석 기록 목록 + 새 분석 진입
│   ├── HistoryDetail.jsx  # 저장된 분석/카드/생성 사진 재열람 + 카드 재오픈
│   ├── Trend.jsx          # 트렌드 "준비 중" 경량 화면 + START ANALYSIS CTA (Phase 4-6)
│   ├── My.jsx             # 계정 화면 — 세션 JWT email/provider 실데이터 + 계정 삭제 시트 (Phase 4-7)
│   └── common/
│       ├── Icons.jsx          # 인라인 SVG 아이콘 세트
│       ├── Layout.jsx         # BackHeader / Section / IndexMark / CtaTile / TabBar / StepDots
│       ├── StatusBar.jsx      # 상단 상태바 목업
│       ├── StateNotice.jsx    # 공통 empty / error / loading 상태 블록 (톤·구조 통일)
│       └── Placeholders.jsx   # FacePlaceholder / MosaicOverlay / ProductPlaceholder (추상 — 실제 인물 사진 절대 금지)
├── styles/                     # 디자인 시스템 토큰 + 글로벌 유틸 (handoff 패키지)
│   ├── tokens.css              # 컬러 / 폰트 / 간격 / letter-spacing
│   └── globals.css             # @font-face, .label / .ko / .serif-i 유틸 클래스
├── data/
│   ├── 촬영가이드 여자.png   # 정면 촬영 가이드 이미지
│   └── 촬영가이드 측면.png   # (참고용, v1.0 미사용)
├── contexts/
│   └── AuthContext.jsx    # Supabase 세션/로그인 상태 + signInAsTestUser (mock 전용)
├── hooks/
│   └── useHaptic.js       # Capacitor Haptics 브리지 (웹 폴백 분기)
├── assets/
│   └── dev-sample-face.jpg # 🧪 mock 전용 샘플 얼굴 (VITE_MOCK 게이트, 운영 빌드 제외)
├── utils/
│   ├── authBridge.js      # OAuth redirect 세션 복원 + post-login return target 저장/소비 + startTestSession(mock)
│   └── validateImage.js   # Canvas API 기반 이미지 유효성 검사
└── devtools/                   # 개발 전용 — VITE_DEV_INSPECTOR=true 일 때만 활성, 운영 빌드 트리 셰이킹
    ├── inspector.js            # 호출 기록 이벤트 버스 + 인메모리 스토리지
    └── PromptInspector.jsx     # 🐞 플로팅 버튼 + 사이드 패널 UI

backend/                        # FastAPI (Phase 2 신규)
├── main.py                     # 앱 진입점 + CORS + 라우터 등록 + MediaPipe 워밍업
├── routes/
│   ├── analyze.py              # POST /api/analyze
│   ├── cards.py                # POST /api/cards/{hair|makeup|total}
│   ├── history.py              # GET/POST /api/history (Phase 3)
│   └── photo.py                # POST /api/photo/generate (로그인 전용)
├── services/
│   ├── mediapipe_service.py    # MediaPipe FaceMesh → faceRatios (tools/landmark.py 이관)
│   ├── gemini_service.py       # Gemini 2.5 Flash 호출 (분석/카드/이미지)
│   ├── rag_service.py          # RAG 컨텍스트 빌더 + 카드 포맷 + ANALYZE_PROMPT (ragUtils.js 이관)
│   └── supabase_service.py     # Supabase Auth/REST/Storage helper (Phase 3)
├── middleware/
│   ├── auth.py                 # Supabase JWT 검증 + 로컬 개발 X-User-Id 폴백
│   └── rate_limit.py           # 인메모리 IP/유저 카운터 (UTC 일자 단위)
├── models/
│   └── schemas.py              # Pydantic 요청/응답 스키마
├── data/                       # RAG JSON (src/data/ 에서 이관)
│   ├── face-hair.json
│   ├── face-makeup.json
│   ├── personal-color-makeup.json
│   ├── feature-tips.json
│   └── rag_usage_guide.md
├── supabase_schema.sql         # Phase 3 테이블/RLS 스키마
└── requirements.txt

capacitor.config.json           # Phase 6 — Capacitor 설정 (appId app.beaumi.coach / appName Beaumi / webDir dist)
android/                        # Phase 6 — npx cap add android 로 생성한 네이티브 Android 프로젝트
                                #   빌드 산출물은 android/.gitignore 가 제외. signed .aab 빌드는 Android Studio 필요.

tools/                          # Phase 1 로컬 평가 도구 (백엔드 이관 후에도 골든셋 회귀용으로 남김)
├── landmark.py                 # MediaPipe 단일/배치 추출 CLI
├── eval.py                     # Gemini 종량제로 골든셋 회귀 평가
├── golden-set.json             # 골든셋 라벨 (imagesDir + items[])
└── requirements.txt

.claude/skills/eval-face/       # Claude 정액제로 골든셋 평가 (Gemini 비용 0)
└── SKILL.md                    # 호출: "/eval-face" 또는 "골든셋 평가해줘"
```


---

## 사진 업로드 구조

| 슬롯 | 필수 여부 | 설명 |
|------|----------|------|
| 정면 사진 | 필수 | 분석 기준 이미지 (1장) |

> v1.0은 정면 1장만 받음. 측면(90도·45도)은 v1.x 이후 검토 — Gemini가 측면을 얼마나 잘 활용하는지 데이터로 확인된 이후에 재도입.

---

## 핵심 데이터 구조

### Gemini 분석 API 응답 스키마
```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 | 판정 어려움",
  "features": ["눈 간격 넓음", "광대 넓음"],
  "moodArchetype": ["ROMANTIC", "CLEAN", "SOFT"],
  "faceRatios": { "foreheadRatio": 0.95, "jawRatio": 0.82, "...": "..." },
  "analysisId": "uuid (로그인 유저만 발급)"
}
```
- `판정 어려움`은 Gemini가 경계형 얼굴(다이아몬드/하트, 땅콩/사각 등) 사이에서 확신이 부족할 때 반환. 프론트는 이때 카드 생성 대신 `"여러 얼굴형 특징이 섞여 있어요"` 안내 카드를 보여준다.
- `moodArchetype`은 8개 키워드(`ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY`) 중 정확히 3개. 퍼블리시티권 회피 정책으로 도입 — 연예인·인물 비교는 모든 응답에서 절대 금지.
- `faceRatios`는 MediaPipe에서 계산한 비율값. 분석 결과 디버깅과 골든셋 회귀 비교용. 프론트는 표시하지 않는다.
- `analysisId`는 로그인 유저에게만 발급되며, 카드 저장(`POST /api/history`)과 사진 생성(`POST /api/photo/generate`)에 사용된다.

### 카드 공통 필드 (추가)
```json
{
  "styleLabel": "클래식 오벌 · 봄웜 비비드",
  "moodLabel": "ROMANTIC · 우아한 분위기"
}
```
- `styleLabel`: 카드 목록 최상단 감성 레이블 (공유 이미지용), Gemini 생성
- `moodLabel`: 무드 아키타입 키워드 + 한국어 분위기 (예: `ELEGANT · 우아한 분위기`). **연예인 비교(`celebrityMatch` 등)는 퍼블리시티권 침해 회피를 위해 전면 금지** — 인물 이름·`○○ st`·look-alike 표현 금지.

### 메이크업 카드 전용 필드 (추가)
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
- `recommendedProducts`: 메이크업 카드 상세 하단 상품 블록용. 초기 범위는 추천 카드 기준 2~4개
- `searchKeyword`: 퍼스널컬러 + 메이크업 파트 기반 추천 키워드. AI가 자유 생성하지 않고 RAG/후처리 규칙에 맞춰 구성
- `coupangPartnersUrl`: 쿠팡파트너스 링크. AI가 직접 생성하지 않고 별도 상품 매핑 또는 운영 데이터에서 주입

### 무드 아키타입 데이터 위치 (연예인 레퍼런스 대체 — 퍼블리시티권 회피)
- `face-hair.json[].moodArchetype` → 얼굴형별 무드 후보 3개 (RAG 컨텍스트로 Gemini에 주입)
  - 예: oval → `["CLEAN", "ELEGANT", "CLASSIC"]`
- `face-makeup.json[].recommendCards[].title` → 카드 타이틀에 무드 키워드 포함
  - 예: `"우아한 분위기 룩 (ELEGANT MOOD)"`, `"시크 도회적 룩 (URBAN CHIC)"`
- 8개 키워드 사전: `ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY`
  - 한국어 매핑은 `backend/services/rag_service.py` 의 `MOOD_ARCHETYPES` 상수
- 응답·UI·로그 어디에도 실제 인물 이름·사진·`○○ st` 표기 금지. `tools/eval.py` 에서 정규식으로 차단할 것.
- MediaPipe 수치(이마/광대/턱 비율, 얼굴길이/폭, 턱 각도)를 함께 전달하여 정확도 향상
- `features`는 0~3개, 확신도 80% 미만이면 포함하지 않음
- 퍼스널컬러는 별도 질문 흐름으로 확정

### RAG JSON 파일 역할

| 파일 | 역할 | 키 구조 |
|------|------|---------|
| `face-hair.json` | 얼굴형별 헤어 추천 | `hairByFaceType[].faceType` (oval/round/square/heart/long/diamond/peanut) |
| `face-makeup.json` | 메이크업 위치·방법 베이스 | `makeupByFaceShape[].faceType` |
| `personal-color-makeup.json` | 컬러 팔레트 레이어 | `makeupByPersonalColor[].personalColor` (spring_warm/summer_cool/autumn_warm/winter_cool) |
| `feature-tips.json` | 이목구비 보정 팁 (최우선) | `featureTips[].label` (한국어 매칭) |

### 한국어 → 영문 키 매핑 (`backend/services/rag_service.py` 내 상수)
- 얼굴형: `계란형→oval`, `둥근형→round`, `사각형→square`, `하트형→heart`, `긴형→long`, `다이아몬드형→diamond`, `땅콩형→peanut`
- 퍼스널컬러: `봄웜→spring_warm`, `여름쿨→summer_cool`, `가을웜→autumn_warm`, `겨울쿨→winter_cool`

---

## 주요 데이터 흐름

1. `Home` → 새 분석 시작 또는 최근 기록 재열기
   - 로그인 사용자는 `fetchHistory(3)` 로 recent 1~3개를 본다
   - 게스트는 recent API를 호출하지 않고 로그인 유도 카피만 본다
2. `PhotoUpload` → 정면 사진 1장 수집 (프론트)
3. 프론트가 `POST /api/analyze` 호출 (`src/api/backend.js`)
   - 백엔드: MediaPipe → `faceRatios`
   - 백엔드: Gemini 2.5 Flash → `{ faceType, features, faceRatios, analysisId? }` 반환
4. `PersonalColor` → 퍼스널컬러 선택 후 분석 시작
5. 프론트가 `POST /api/cards/{hair|makeup|total}` 호출
   - 백엔드: `rag_service.build_*_context` → Gemini → 카드 4장 생성
6. 카드 선택 시 → `CardDetail` / `MakeupDetail` 진입
   - 메이크업 카드: `recommendedProducts` + 쿠팡파트너스 링크 + 고지 문구 노출 (사진 생성 미지원)
   - 헤어/종합 추천 카드: `POST /api/photo/generate` (로그인 전용) → Gemini → data URL 반환
7. `History` / `HistoryDetail`
   - `GET /api/history` → 최근 5회 목록
   - `GET /api/history/{analysisId}` → 저장된 분석/카드/생성 사진 조회
   - `HistoryDetail` 에서 저장된 헤어/메이크업 카드를 다시 열 때 `analysisId` 를 카드에 복원해 TRY ON 재사용 가능

> 모든 AI 호출은 백엔드를 경유한다. 프론트엔드는 더 이상 Gemini API 키를 갖지 않는다.

> 현재 프론트는 `api/ai.js` 를 통해 실제 백엔드/모의 데이터를 모두 호출한다. 다만 `Trend.jsx`, `My.jsx`, `MakeupDetail.jsx` 일부 영역은 여전히 mock 중심이며, `generateTotalCards` 백엔드 경로는 있어도 v1.0 UI에서는 직접 노출하지 않는다.

---

## Beaumi 디자인 시스템

| 영역 | 값 |
|------|---|
| 컬러 | `#fff` 배경 + `#000` 라인/텍스트, 액센트 `#f6f1ed` (warm beige), 경고 `#c45a3b` |
| 폰트 | Pretendard (한글), Jost (영문 라벨, `letter-spacing: .22em` uppercase), Cormorant Garamond Italic (nº 표기) |
| 모서리 | 0px (사각 그리드) |
| 톤 | 에디토리얼 매거진 — 1px 검정 라인 + 큰 흑백 사진 |

### 라벨 패턴 (어디서든 동일)
- `STEP 04 · TRY ON` (Jost uppercase + 12px) — `.label` 유틸 클래스
- `nº 01` (serif italic) — `.serif-i`
- `1ST · BEST MATCH` (Jost uppercase)
- `ROMANTIC` / `CLEAN` / `SOFT` (무드 키워드 — **인물 이름 절대 X**)

### 절대 추가 금지
- 실제 연예인 이름·사진
- "닮은꼴" / "look-alike" 비교 기능
- "○○ st" 표기
- 인물 비주얼은 모두 추상 무드 카드 또는 가상 placeholder (`Placeholders.jsx` 참조)
