# Phase 2 — 백엔드 분리 + 보안

> 현재: API 키가 클라이언트에 노출됨 → 과금 폭탄 리스크
> 목표: 모든 AI API 호출을 백엔드 서버로 이동

---

## 현재 보안 문제

```
현재 구조:
브라우저 → Claude API (직접 호출, API 키 노출)
브라우저 → Gemini API (직접 호출, API 키 노출)

문제:
- 브라우저 개발자 도구에서 API 키 탈취 가능
- 누군가 키를 가져가면 무제한 API 호출 → 수십만원 과금 가능
- Rate limiting 없음 → 1명이 수천 번 호출 가능
```

```
목표 구조:
브라우저 → 우리 백엔드 API → Claude API
                            → Gemini API
                            → Coupang API
```

---

## 2-1. 백엔드 서버 세팅

### 기술 선택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | Python 3.11+ | MediaPipe 네이티브 지원, AI 생태계 표준 |
| 프레임워크 | FastAPI | 빠름, 자동 문서화, 비동기 지원 |
| DB | Supabase (PostgreSQL) | Auth + DB + Storage 통합, 무료 티어 |
| 배포 | Railway | Python 지원, 간단한 배포, 무료 티어 |
| 환경변수 | python-dotenv + Railway secrets | |

### 코드 스타일
- **routes**: 함수형 (FastAPI 라우터 핸들러)
- **services**: 클래스형 (비즈니스 로직)
- **models**: Pydantic 클래스 (요청/응답 스키마)

### 폴더 구조

```
/
├── web/               ← 현재 React + Vite (웹 유지)
├── app/               ← React Native (Expo, Phase 6)
└── backend/           ← 새로 생성 (Python FastAPI)
    ├── main.py                  # FastAPI 앱 진입점
    ├── requirements.txt
    ├── .env
    ├── routes/
    │   ├── analyze.py           # 얼굴 분석 엔드포인트
    │   ├── cards.py             # 카드 생성 엔드포인트
    │   ├── photo.py             # Gemini 이미지 생성
    │   └── history.py           # 히스토리 저장/조회
    ├── services/
    │   ├── mediapipe_service.py # MediaPipe 랜드마크 추출 + 수치 계산
    │   ├── gemini_service.py    # Gemini API (분석 + 카드 + 이미지)
    │   └── supabase_service.py  # DB 조회/저장
    ├── models/
    │   └── schemas.py           # Pydantic 요청/응답 스키마
    └── middleware/
        ├── auth.py              # JWT 검증
        └── rate_limit.py        # Rate limiting
```

---

## 2-2. API 엔드포인트 설계

### POST `/api/analyze`
```python
# Request
class AnalyzeRequest(BaseModel):
    frontImage: str                        # base64
    additionalImages: list[AdditionalImage] = []

# Response
class AnalyzeResponse(BaseModel):
    faceType: str                          # 계란형 | 둥근형 | ...
    features: list[str]                    # 이목구비 특징 0~3개
    faceRatios: FaceRatios                 # MediaPipe 수치 (내부 로깅용)
```

### POST `/api/cards/hair` · `/api/cards/makeup` · `/api/cards/total`
```python
class CardsRequest(BaseModel):
    faceType: str
    personalColor: str | None
    features: list[str]

# Response: list[Card] (카드 4장)
```

### POST `/api/photo/generate` (유료 전용)
```python
class PhotoRequest(BaseModel):
    frontImage: str    # base64
    card: dict         # 카드 객체

class PhotoResponse(BaseModel):
    generatedImage: str  # base64
```

---

## 2-3. Rate Limiting

```
비로그인(게스트):
- /api/analyze : 1회/IP/일
- /api/cards/* : 3회/IP/일
- /api/photo/* : 0회 (로그인 필수)

로그인 유저:
- /api/analyze : 5회/유저/일
- /api/cards/* : 15회/유저/일
- /api/photo/* : 유료 플랜만 허용

Rate limit 초과 시: 429 Too Many Requests
```

### 구현 방법
- `slowapi` 라이브러리 (FastAPI용 Rate Limiter)
- IP 기반: 메모리 (초기) → Redis (스케일 업 시)
- 유저 기반: Supabase DB `usage_counters` 테이블

---

## 2-4. 앱/웹 수정 사항

### 해야 할 것

- [ ] `src/api/claude.js`, `src/api/gemini.js` → 백엔드 엔드포인트 호출로 변경
  ```js
  // 변경 전: Gemini/Claude API 직접 호출
  fetch('https://generativelanguage.googleapis.com/...', { ... })

  // 변경 후: 우리 백엔드로
  fetch(`${API_URL}/api/analyze`, { method: 'POST', body: JSON.stringify(data) })
  ```
- [ ] 환경변수 `VITE_API_URL` 추가 (개발: `http://localhost:8000`, 프로덕션: Railway URL)
- [ ] `VITE_ANTHROPIC_API_KEY`, `VITE_GEMINI_API_KEY` 프론트에서 완전 제거
- [ ] React Native 앱도 동일한 백엔드 URL 사용 (`API_URL` 환경변수)

---

## 2-5. 백엔드 배포

### requirements.txt
```
fastapi
uvicorn
mediapipe
google-generativeai
supabase
python-dotenv
slowapi
python-multipart
Pillow
```

### Railway 배포 순서
1. `railway login`
2. `railway init` (backend 폴더에서)
3. 환경변수 Railway 대시보드에서 설정:
   ```
   GEMINI_API_KEY=...
   SUPABASE_URL=...
   SUPABASE_SERVICE_KEY=...
   JWT_SECRET=...
   ```
4. `Procfile` 작성: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
5. GitHub 연동 → 자동 배포
6. Railway 도메인 확인: `https://your-app.railway.app`

### 웹 Vercel 환경변수 업데이트
```
VITE_API_URL=https://your-app.railway.app
VITE_MOCK=false
# VITE_GEMINI_API_KEY 삭제
# VITE_ANTHROPIC_API_KEY 삭제
```

---

## 2-6. CORS 설정

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # 웹 개발
        "https://your-app.vercel.app",    # 웹 프로덕션
        "http://localhost:8081",          # RN 개발 (Expo)
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## Phase 2 완료 기준 체크리스트

- [ ] 백엔드 서버 생성 및 로컬 실행 확인
- [ ] `/api/analyze` 엔드포인트 동작 확인
- [ ] `/api/cards/*` 엔드포인트 동작 확인
- [ ] 프론트엔드 API 키 환경변수 완전 제거
- [ ] Rate limiting 적용 확인 (초과 시 429 응답)
- [ ] Railway 배포 완료
- [ ] Vercel 프론트 → Railway 백엔드 통신 확인
- [ ] 개발자 도구에서 API 키 노출 없음 확인
