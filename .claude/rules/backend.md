---
paths:
  - "backend/**"
  - "tools/**"
---

# 백엔드 작업 규칙 (Python + FastAPI)

## 모듈 지도

| 경로 | 역할 |
|------|------|
| `backend/main.py` | 앱 진입점 + CORS + 라우터 등록 + MediaPipe 워밍업 |
| `backend/routes/analyze.py` | `POST /api/analyze` |
| `backend/routes/cards.py` | `POST /api/cards/{hair\|makeup\|total}` |
| `backend/routes/history.py` | `GET/POST /api/history` |
| `backend/routes/photo.py` | `POST /api/photo/generate` (로그인 전용) |
| `backend/services/mediapipe_service.py` | MediaPipe FaceMesh → `faceRatios` (`tools/landmark.py` 이관) |
| `backend/services/gemini_service.py` | Gemini 2.5 Flash 호출 (분석/카드/이미지) |
| `backend/services/rag_service.py` | RAG 컨텍스트 빌더 + 카드 포맷 + `ANALYZE_PROMPT` |
| `backend/services/supabase_service.py` | Supabase Auth/REST/Storage helper |
| `backend/middleware/auth.py` | Supabase JWT 검증 + 로컬 개발 `X-User-Id` 폴백 |
| `backend/middleware/rate_limit.py` | 인메모리 IP/유저 카운터 (UTC 일자 단위) |
| `backend/models/schemas.py` | Pydantic 요청/응답 스키마 |
| `backend/supabase_schema.sql` | 테이블/RLS 스키마 |
| `backend/test_integration.py` | 백엔드 통합 스모크 (pytest, 프론트 vitest 와 별개) |
| `backend/test_phase3.py` | 인증/히스토리 경로 스모크 (pytest) |

> 경로는 **저장소 루트 기준**이다. `uvicorn` 은 `backend/` 안에서 띄우지만
> 파일을 열 때는 위 경로를 그대로 쓴다.

`tools/` 는 골든셋 회귀용 로컬 평가 도구다. `landmark.py` (MediaPipe 추출 CLI),
`eval.py` (Gemini 종량제 평가), `golden-set.json` (라벨). Gemini 비용 없이 돌리려면
`.claude/skills/eval-face/` 스킬(`/eval-face`)을 쓴다.

## RAG JSON 파일 역할 (`backend/data/`)

| 파일 | 역할 | 키 구조 |
|------|------|---------|
| `face-hair.json` | 얼굴형별 헤어 추천 | `hairByFaceType[].faceType` (oval/round/square/heart/long/diamond/peanut) |
| `face-makeup.json` | 메이크업 위치·방법 베이스 | `makeupByFaceShape[].faceType` |
| `personal-color-makeup.json` | 컬러 팔레트 레이어 | `makeupByPersonalColor[].personalColor` (spring_warm/summer_cool/autumn_warm/winter_cool) |
| `feature-tips.json` | 이목구비 보정 팁 (최우선) | `featureTips[].label` (한국어 매칭) |

병합 규칙·우선순위는 `backend/data/rag_usage_guide.md` 가 단일 진실 소스다.
이 구조를 바꾸면 해당 가이드를 같은 작업에서 갱신한다.

## 한국어 → 영문 키 매핑 (`backend/services/rag_service.py` 내 상수)

- 얼굴형: `계란형→oval`, `둥근형→round`, `사각형→square`, `하트형→heart`, `긴형→long`, `다이아몬드형→diamond`, `땅콩형→peanut`
- 퍼스널컬러: `봄웜→spring_warm`, `여름쿨→summer_cool`, `가을웜→autumn_warm`, `겨울쿨→winter_cool`

Gemini 는 한국어 값을 반환하고 RAG JSON 은 영문 키를 쓴다. 새 얼굴형·퍼스널컬러를 추가하면
**양쪽 사전과 RAG JSON 을 함께** 갱신해야 조용한 조회 실패가 안 생긴다.

## 무드 아키타입 (연예인 레퍼런스 대체 — 퍼블리시티권 회피)

- 8개 키워드 사전: `ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY`
  - 한국어 매핑은 `backend/services/rag_service.py` 의 `MOOD_ARCHETYPES` 상수
- `face-hair.json[].moodArchetype` → 얼굴형별 무드 후보 3개 (RAG 컨텍스트로 Gemini 에 주입)
  - 예: oval → `["CLEAN", "ELEGANT", "CLASSIC"]`
- `face-makeup.json[].recommendCards[].title` → 카드 타이틀에 무드 키워드 포함
  - 예: `"우아한 분위기 룩 (ELEGANT MOOD)"`, `"시크 도회적 룩 (URBAN CHIC)"`
- **응답·UI·로그 어디에도 실제 인물 이름·사진·`○○ st` 표기 금지.**
  `.claude/hooks/check-file.mjs` 가 저장 시점에, `tools/eval.py` 가 평가 시점에 차단한다.

## 분석 프롬프트 규칙 (`ANALYZE_PROMPT`)

- MediaPipe 수치(이마/광대/턱 비율, 얼굴길이/폭, 턱 각도)를 함께 전달해 정확도를 올린다.
- `features` 는 0~3개. 확신도 80% 미만이면 포함하지 않는다.
- 경계형 얼굴에서 확신이 부족하면 `판정 어려움` 을 반환한다 (억지 판정 금지).
- 퍼스널컬러는 프롬프트로 추론하지 않는다 — 사용자가 별도 질문 흐름에서 확정한다.
- 프롬프트를 수정하면 반드시 `/eval-face` 로 골든셋 회귀를 돌린다. 목표는 정확도 90%+.

## 불변식

1. **AI 키는 백엔드에만 둔다.** `GEMINI_API_KEY` 를 응답·로그·프론트로 흘리지 않는다.
2. **모든 AI 호출은 백엔드를 경유한다.** 프론트에 Gemini 호출을 되돌리지 않는다.
3. **인증이 필요한 엔드포인트에 `X-User-Id` 폴백을 신뢰하지 않는다.** 로컬 개발 편의 장치이며
   운영에서는 Supabase JWT 검증만 유효하다.
4. `backend/models/schemas.py` 는 프론트와의 계약이다. 필드를 바꾸면 `src/api/` 와 관련 테스트를 함께 고친다.

## 검증

```bash
uvicorn main:app --reload --port 8000
```

`http://localhost:8000/docs` (Swagger UI) 로 엔드포인트를 직접 호출해 확인한다.
프론트-백엔드 연결 현황은 `docs/connection-status.md` 참조.
