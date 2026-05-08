# Backend — AI 뷰티 코치 FastAPI

Phase 2 산출물. 프론트엔드(웹/Capacitor)가 직접 호출하던 Gemini API를 이 서버 뒤로 숨긴다.

## 로컬 실행

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate         # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env             # GEMINI_API_KEY 채우기
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
│   └── photo.py             # POST /api/photo/generate
├── services/
│   ├── mediapipe_service.py # MediaPipe FaceMesh → faceRatios
│   ├── gemini_service.py    # Gemini 2.5 Flash 호출 (분석/카드/이미지)
│   └── rag_service.py       # face-hair/face-makeup/... RAG 컨텍스트 빌더
├── middleware/
│   ├── auth.py              # 사용자 식별 (Phase 3 전 스텁)
│   └── rate_limit.py        # 인메모리 IP/유저 카운터
├── models/
│   └── schemas.py           # Pydantic 요청/응답 스키마
└── data/                    # RAG JSON (face-hair, face-makeup, ...)
```

## 엔드포인트

| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/analyze` | 게스트/로그인 | 정면 사진 1장 → faceType + features + faceRatios |
| POST | `/api/cards/hair` | 게스트/로그인 | 헤어 카드 4장 |
| POST | `/api/cards/makeup` | 게스트/로그인 | 메이크업 카드 4장 |
| POST | `/api/cards/total` | 게스트/로그인 | 헤어+메이크업 종합 카드 4장 |
| POST | `/api/photo/generate` | 로그인 전용 | 스타일 적용 사진 (Gemini 이미지 생성) |
| GET | `/api/health` | - | 헬스체크 |

> Phase 3에서 `/api/history`, Supabase Storage 기반 사진 저장, 카카오/구글 로그인을 추가한다.

## Rate Limit (Phase 2 — in-memory)

| 엔드포인트 | 게스트 (IP/일) | 로그인 (유저/일) |
|-----------|---------------|----------------|
| `/api/analyze` | 1 | 5 |
| `/api/cards/*` | 3 (3종 합산) | 15 (3종 합산) |
| `/api/photo/*` | 0 (401 거부) | 5 |

서버 재시작 시 카운터가 초기화되며, 멀티 인스턴스 배포 시에는 Phase 3에서 Supabase `usage_counters` 또는 Redis로 교체한다.

## 인증 (Phase 2 스텁)

`middleware/auth.py` 가 `X-User-Id` 헤더만 읽어 사용자 식별을 흉내낸다. Phase 3에서 Supabase JWT 검증으로 교체한다.

## Phase 1 산출물 이관

- `tools/landmark.py` → `services/mediapipe_service.py`
- `src/api/gemini.js` → `services/gemini_service.py`
- `src/utils/ragUtils.js` → `services/rag_service.py`
- `src/data/*.json` → `backend/data/*.json`

## 배포

- 개발/QA: Render 무료 (15분 비활성 슬립)
- 출시 운영: Railway Hobby (슬립 없음)

자세한 단계는 `docs/phase2-backend.md` 의 "2-5. 배포 단계" 참고.
