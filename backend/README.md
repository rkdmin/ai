# Backend — AI 뷰티 코치 FastAPI

Phase 2 산출물에 Phase 3 인증/히스토리 저장 흐름을 붙인 FastAPI 서버.
프론트엔드(웹/Capacitor)가 직접 호출하던 Gemini API를 이 서버 뒤로 숨긴다.

## 로컬 실행

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate         # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # GEMINI_API_KEY, Supabase 값 채우기
uvicorn main:app --reload --port 8000
```

브라우저: <http://localhost:8000/docs> (Swagger UI 자동 생성)

## 폴더 구조

```
backend/
├── main.py                  # FastAPI 앱 + CORS + 라우터 등록
├── routes/
│   ├── analyze.py           # POST /api/analyze
│   ├── cards.py             # POST /api/cards/{hair|makeup|total}
│   ├── history.py           # GET/POST /api/history
│   └── photo.py             # POST /api/photo/generate
├── services/
│   ├── mediapipe_service.py # MediaPipe FaceMesh → faceRatios
│   ├── gemini_service.py    # Gemini 2.5 Flash 호출 (분석/카드/이미지)
│   ├── rag_service.py       # face-hair/face-makeup/... RAG 컨텍스트 빌더
│   └── supabase_service.py  # Supabase Auth/REST/Storage helper
├── middleware/
│   ├── auth.py              # Supabase JWT 검증 + 로컬 개발 폴백
│   └── rate_limit.py        # 인메모리 IP/유저 카운터
├── models/
│   └── schemas.py           # Pydantic 요청/응답 스키마
├── data/                    # RAG JSON (face-hair, face-makeup, ...)
└── supabase_schema.sql      # Phase 3 테이블/RLS 스키마
```

## 엔드포인트

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/analyze` | 게스트/로그인 | 정면 사진 1장 → faceType + features + faceRatios |
| POST | `/api/cards/hair` | 게스트/로그인 | 헤어 카드 4장 |
| POST | `/api/cards/makeup` | 게스트/로그인 | 메이크업 카드 4장 |
| POST | `/api/cards/total` | 게스트/로그인 | 헤어+메이크업 종합 카드 4장 |
| POST | `/api/photo/generate` | 로그인 전용 | 스타일 적용 사진 (Gemini 이미지 생성) |
| POST | `/api/history` | 로그인 전용 | 카드 데이터 수동 저장 |
| GET | `/api/history` | 로그인 전용 | 최근 분석 히스토리 목록 |
| GET | `/api/history/{analysisId}` | 로그인 전용 | 분석 히스토리 상세 |
| GET | `/api/health` | - | 헬스체크 |

로그인 사용자의 `/api/analyze` 응답은 `analysisId`를 포함하며, 정면 사진은 Supabase Storage에 저장된다.
카드 생성 라우트는 `analysisId`가 있으면 `cards` 테이블에도 저장한다.

## Rate Limit (Phase 2 — in-memory)

| 엔드포인트 | 게스트 (IP/일) | 로그인 (유저/일) |
|-----------|---------------|----------------|
| `/api/analyze` | 1 | 5 |
| `/api/cards/*` | 3 (3종 합산) | 15 (3종 합산) |
| `/api/photo/*` | 0 (401 거부) | 5 |

서버 재시작 시 카운터가 초기화되며, 멀티 인스턴스 배포 시에는 Phase 3에서 Supabase `usage_counters` 또는 Redis로 교체한다.

## 인증

`Authorization: Bearer <Supabase access token>` 을 우선 검증한다.
Supabase 환경변수가 비어있는 로컬 개발/테스트에서는 `X-User-Id` 헤더 폴백을 허용한다.

Supabase 설정:

1. `backend/supabase_schema.sql` 을 Supabase SQL Editor에 적용한다.
2. Storage bucket `analysis-photos` 를 생성한다. 다른 이름이면 `SUPABASE_PHOTO_BUCKET` 을 바꾼다.
3. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 를 backend `.env` 에 설정한다.
4. 프론트 `.env` 에 `VITE_SUPABASE_URL` 을 설정하고 Supabase Auth에서 Kakao/Google OAuth provider와 redirect URL을 등록한다.

## Phase 1 산출물 이관

- `tools/landmark.py` → `services/mediapipe_service.py`
- `src/api/gemini.js` → `services/gemini_service.py`
- `src/utils/ragUtils.js` → `services/rag_service.py`
- `src/data/*.json` → `backend/data/*.json`

## 배포

- 개발/QA: Render 무료 (15분 비활성 슬립)
- 출시 운영: Railway Hobby (슬립 없음)

자세한 단계는 `docs/phase2-backend.md` 의 "2-5. 배포 단계" 참고.
