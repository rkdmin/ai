# CLAUDE.md

정면 사진 1장으로 얼굴형을 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장),
전문가 피드백, 메이크업 카드용 추천 제품 + 쿠팡파트너스 링크를 제공하는 **AI 뷰티 코치 앱**입니다.

---

## 📍 컨텍스트가 어디 있나

이 파일은 **매 세션 전체가 로드된다.** 그래서 여기에는 항상 참인 짧은 사실만 둔다.
영역별 상세는 아래로 분산되어 있고, 해당 파일을 다룰 때 자동으로 로드된다.

| 위치 | 내용 | 로드 시점 |
|------|------|----------|
| `CLAUDE.md` (이 파일) | 스택·실행 명령·전역 불변식 | 매 세션 |
| `.claude/rules/frontend.md` | Beaumi 디자인 시스템, 컴포넌트 지도 | `src/**`, `test/**` 열 때 |
| `.claude/rules/backend.md` | RAG 데이터 구조, 키 매핑, 프롬프트 규칙 | `backend/**`, `tools/**` 열 때 |
| `.claude/rules/api-contract.md` | 분석/카드 응답 스키마, 데이터 흐름 | 위 계약 코드를 열 때 |
| `.claude/hooks/` | 인코딩·금지어·문서동기화 **강제** 검사 | 파일 저장 / 작업 종료 시 |
| `docs/README.md` | 문서 지도 — 무엇이 어디 있나 | 필요할 때 조회 |
| `docs/plans/` | 무엇을 어떤 순서로 (번호 붙은 실행 계획 + 체크리스트) | 작업 범위를 잡을 때 조회 |
| `docs/decisions/` | 왜 이렇게 정했나 (ADR, append-only) | 배경이 필요할 때 조회 |

> **서브에이전트 주의**: Explore·Plan 서브에이전트는 이 파일과 `.claude/rules/` 를 읽지 않는다.
> 위임할 때 필수 규칙을 프롬프트에 다시 적어라. 단, `.claude/hooks/` 는 도구 계층에서 동작하므로
> 서브에이전트에도 그대로 적용된다.

---

## ⚠️ 문서 업데이트 규칙

기능이 변경되면 대응 문서를 **같은 작업에서** 갱신한다. 어긋나면 다음 세션이 잘못된 컨텍스트로 일한다.

| 무엇을 바꿨나 | 함께 갱신할 문서 |
|--------------|----------------|
| step 추가/삭제, 컴포넌트 동작·조건·state | `docs/ui-flow.md` |
| 테스트 구조·품질 게이트 | `docs/test.md` |
| API 엔드포인트·응답 스키마 | `.claude/rules/api-contract.md` |
| RAG 데이터 구조·병합 규칙·우선순위 | `backend/data/rag_usage_guide.md` |
| 엔드포인트 wiring (연결/미연결 상태) | `docs/connection-status.md` |
| Supabase/Auth/OAuth 콘솔 설정 | `docs/auth-setup.md` |
| 작업 항목을 끝냈거나 접었을 때 | 해당 `docs/plans/NNNN-*.md` 체크박스 (접은 건 취소선 + 이유) |
| Phase 진행 상태 · 큰 그림 | `docs/ROADMAP.md` (상세 체크리스트는 `docs/plans/` 가 갖는다) |
| 디렉토리 구조·스택·실행 명령 | `CLAUDE.md` (이 파일) + 해당 `.claude/rules/` |
| 결정을 번복 | **새 ADR 추가** (`docs/decisions/README.md` 규율 참조) |

### 이 규칙이 어떻게 지켜지나

검사 엔진은 `scripts/docs-check.mjs` **하나**이고 진입점만 둘이다.

- **`npm run docs:check`** (수동) / **`.claude/hooks/check-docs.mjs`** (작업 종료 시 자동)
- 무엇을 보나: 죽은 링크, 백엔드에 없는 API 필드, `.claude/rules/` YAML 유효성,
  ADR 규율, **plan 규율(번호·인덱스·status 정합성)**, `last-verified` 경과일.
  즉 문서가 *주장하는 사실*이 맞는지 본다.
- plan 진행률만 따로 보려면 `npm run plans:progress`.
- `FAIL` 이면 종료가 막힌다. `WARN`(`last-verified` 경과)은 막지 않는다.
- 코드와 대조해 문서를 확인했으면 그 문서의 `last-verified` 를 그날 날짜로 갱신한다.
  **확인하지 않았으면 올리지 마라** — 경고가 뜨는 게 거짓 기록보다 낫다.
- 산문 주장("~는 mock 이다")은 스크립트가 못 잡는다. 그건 `/docs-audit` 스킬의 절차로 점검한다.

---

## ⚠️ 파일 인코딩 규칙 (필수)

<!-- check-file:allow-encoding-sample — 아래 본문이 깨진 글자를 예시로 인용하므로 hook 의 글자 검사를 면제한다.
     블록 단위 HTML 주석은 컨텍스트 로드 전에 제거되므로 토큰을 쓰지 않는다. -->

**모든 텍스트 파일은 `UTF-8`(BOM 없음) + `LF` 줄끝으로 저장한다.**

이 저장소는 한글과 `·`(가운뎃점, U+00B7) 를 코드·테스트·문서에 직접 쓴다. CP949/EUC-KR 로
저장하면 `·` 가 `쨌` 같은 깨진 글자로 바뀌어 **화면에 그대로 렌더되고, 컴포넌트와 테스트가 같이
깨지면 테스트는 통과하지만 UI 만 깨지는** 사고가 난다 (2026-05 실제 발생).

- PowerShell 로 파일을 쓸 때는 `-Encoding utf8` 을 명시한다.
- IDE 파일 인코딩이 UTF-8 인지 확인한다 (IntelliJ: Settings → Editor → File Encodings, 3곳 모두).
- `.gitattributes` 가 텍스트 확장자를 LF 로 정규화한다. 새 텍스트 확장자를 쓰면 여기에도 등록한다.
- 저장 시점에 `.claude/hooks/check-file.mjs` 가 BOM·CRLF·깨진 글자를 차단한다.

---

## 🚫 전역 불변식 (어기면 안 되는 것)

1. **제품 산출물에서 실제 연예인 이름·사진·`○○ st`·"닮은꼴" 비교는 전면 금지.**
   퍼블리시티권 침해 리스크 (판례: 2013가합509239). 대신 무드 아키타입 8개 키워드
   (`ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY`)를 쓴다.
   인물 비주얼은 추상 무드 카드 또는 `Placeholders.jsx` 의 가상 placeholder 만 쓴다.
   적용 범위는 **API 응답·UI·로그·공유 이미지·프롬프트** 전부다.
   경위는 `src/handoff/CLAUDE_CODE_NOTES.md`, 강제는 `.claude/hooks/check-file.mjs`.
   - **예외는 내부 평가 fixture 뿐이다.** `src/data/test/` 골든셋 9장은 실제 인물 사진이고
     `src/assets/dev-sample-face.jpg` 도 그 중 하나다. 평가 입력으로만 쓰고 제품 경로로
     새어나가지 않게 한다. 경계와 미해결 라이선스 이슈는 `tools/README.md` 참조.
2. **AI 키는 백엔드에만 둔다.** 모든 Gemini 호출은 백엔드를 경유한다. 프론트엔드는 키를 갖지 않는다.
3. **네이티브 기능에는 항상 웹 폴백을 둔다.** 카메라·공유·저장·외부링크·햅틱 모두
   `isNativePlatform()` 분기 + 웹 경로가 있어야 `npm run dev` 가 살아 있다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 (웹) | React + Vite |
| 앱 | React + Capacitor |
| 얼굴 측정 | MediaPipe (Python, 백엔드) |
| AI 분석 + 카드 생성 | Gemini 2.5 Flash |
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
```

→ http://localhost:5173 · 검증은 `npm run verify` (lint + test + docs:check 일괄)

루트 `.env`:
```
VITE_API_URL=http://localhost:8000  # 백엔드 주소 (필수)
VITE_MOCK=                          # true 면 백엔드 호출 없이 더미 데이터
VITE_DEV_INSPECTOR=                 # true 면 🐞 인스펙터 노출
VITE_SUPABASE_URL=                  # OAuth redirect URL (https://*.supabase.co)
VITE_SENTRY_DSN=                    # 있으면 Sentry 활성, 없으면 no-op
```

### 백엔드 (Python + FastAPI)

**Python 3.11 을 쓴다** — 배포(`backend/Dockerfile`)가 `python:3.11-slim` 이므로 로컬도 맞춘다.
`requirements.txt` 의 `numpy<2.0` 은 Python 3.13+ 용 wheel 이 없어서, 3.14 로 venv 를 만들면
소스 빌드로 넘어가 C 컴파일러 부재로 실패한다.

```bash
cd backend
py -3.11 -m venv .venv              # `python -m venv` 금지 — 기본 파이썬이 3.11 이 아닐 수 있다
. .venv/Scripts/activate            # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                # GEMINI_API_KEY / Supabase 값 채우기
uvicorn main:app --reload --port 8000
```

→ http://localhost:8000/docs (Swagger UI)

`backend/.env`:
```
GEMINI_API_KEY=                     # 필수
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost,capacitor://localhost
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PHOTO_BUCKET=analysis-photos
```

---

## 저장소 지도

```
src/          프론트엔드 (웹/Capacitor 공용) — 상세: .claude/rules/frontend.md
  api/          ai.js(라우터) / backend.js(HTTP) / mock.js
  components/   화면 단위 + common/ 공용 프리미티브
  styles/       tokens.css / globals.css (디자인 시스템)
  contexts/ hooks/ utils/ assets/ devtools/
  handoff/      디자인 handoff 패키지 + 정책 변경 노트
backend/      FastAPI — 상세: .claude/rules/backend.md
  routes/ services/ middleware/ models/ data/(RAG JSON) supabase_schema.sql
test/         vitest + Testing Library (컴포넌트 + 통합)
tools/        골든셋 회귀 평가 CLI (landmark.py / eval.py / golden-set.json)
docs/         문서 — 지도: docs/README.md, 실행 계획: docs/plans/, 결정 기록: docs/decisions/
android/      npx cap add android 산출물 (signed .aab 는 Android Studio 필요)
capacitor.config.json   appId app.beaumi.coach / appName Beaumi / webDir dist
.claude/      rules/(경로 스코프 규칙) hooks/(강제 검사) skills/(반복 절차) settings.json
```

---

## 이슈별 1차 시작점

| 증상 | 먼저 볼 곳 |
|------|-----------|
| 얼굴형 판정이 이상하다 | `backend/services/rag_service.py` 의 `ANALYZE_PROMPT` → `/eval-face` 로 골든셋 회귀 |
| 카드 내용이 엉뚱하다 | `backend/data/*.json` + `rag_service.build_*_context` |
| 화면 흐름이 안 맞다 | `docs/ui-flow.md` → `src/App.jsx` |
| API 가 붙지 않는다 | `docs/connection-status.md` → `src/api/ai.js` |
| 로그인이 안 된다 | `docs/auth-setup.md` → `src/utils/authBridge.js` + `backend/middleware/auth.py` |
| 앱(네이티브)에서만 깨진다 | `src/utils/platform.js` 분기 → `docs/decisions/0006-phase6-capacitor-android.md` |
| 한글이 깨져 보인다 | 위 "파일 인코딩 규칙" — UTF-8 로 다시 저장 |

---

## 스킬

- `/eval-face` — 골든셋 사진에 `ANALYZE_PROMPT` 를 돌려 얼굴형 판정을 수집·비교한다.
  Gemini API 비용 없이 동작. 프롬프트를 수정했으면 반드시 회귀를 돌린다.
- `/plan` — 실행 계획(`docs/plans/`)을 만들고 갱신한다. 새 계획 번호 부여, 끝난 항목 체크,
  접은 항목 취소선 + 이유, 진행률 확인. 규약은 `docs/plans/README.md` 가 단일 소스다.
- `/docs-audit` — 문서가 코드와 어긋났는지 점검하고 `last-verified` 를 갱신한다.
  `docs:check` 가 못 잡는 산문 주장("~는 mock 이다")을 코드와 직접 대조하는 절차.
