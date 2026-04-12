# Phase 2 — 백엔드 분리 + 보안

> 현재: AI API 키가 프론트에 노출될 수 있음
> 목표: 모든 AI 호출을 `FastAPI` 백엔드로 이동하고, 배포는 `Render 무료 → Railway Hobby` 단계로 가져간다.

> 참고: Phase 1에서 MediaPipe 정확도 검증용 최소 백엔드를 먼저 쓸 수 있다.
> Phase 2는 그 임시 구성을 **정식 서비스 백엔드**로 제품화하는 단계다.

---

## 현재 보안 문제

```
현재 구조:
브라우저 / Capacitor 앱 → AI API 직접 호출

문제:
- 클라이언트 번들에서 API 키 탈취 가능
- Rate limiting 없음 → 과금 폭탄 리스크
- 분석 / 카드 / 이미지 생성 사용량 추적이 어려움
```

```
목표 구조:
웹 / Capacitor 앱 → 우리 백엔드 API
                      ├─ Gemini API
                      ├─ Supabase
                      └─ 쿠팡/외부 연동
```

---

## 2-1. 백엔드 서버 세팅

### Phase 1과의 관계

- Phase 1: MediaPipe + Gemini 검증용 최소 서버
- Phase 2: 인증, Rate Limit, 저장, 배포, 운영 구조까지 포함한 정식 서버
- 즉, Phase 2에서 백엔드가 처음 생기는 것이 아니라 **정식화**된다고 보는 것이 맞다

### 기술 선택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | Python 3.11+ | MediaPipe 지원, AI 생태계 표준 |
| 프레임워크 | FastAPI | 빠름, 자동 문서화, 비동기 지원 |
| DB / 인증 | Supabase | Auth + DB + Storage 통합 |
| 배포 | Render 무료(개발·테스트) → Railway Hobby(출시 초기) | 초기 비용 최소화 + 출시 후 슬립 제거 |
| 환경변수 | python-dotenv + Render/Railway secrets | 로컬/배포 모두 관리 용이 |

### 코드 스타일
- `routes`: 함수형 라우터 핸들러
- `services`: 비즈니스 로직 분리
- `models`: Pydantic 요청/응답 스키마

### 폴더 구조

```
/
├── src/                     ← 현재 React + Vite 앱 (웹/Capacitor 공용)
├── docs/
├── backend/                 ← 새로 생성
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   ├── routes/
│   │   ├── analyze.py
│   │   ├── cards.py
│   │   ├── photo.py
│   │   ├── history.py
│   ├── services/
│   │   ├── mediapipe_service.py
│   │   ├── gemini_service.py
│   │   ├── supabase_service.py
│   │   └── rate_limit_service.py
│   ├── models/
│   │   └── schemas.py
│   └── middleware/
│       ├── auth.py
│       └── rate_limit.py
├── capacitor.config.ts      ← Phase 6에서 추가
├── android/                 ← Phase 6에서 생성
└── ios/                     ← Phase 6에서 생성
```

---

## 2-2. API 엔드포인트 설계

### POST `/api/analyze`

```python
class AdditionalImage(BaseModel):
    data: str
    angle: str

class AnalyzeRequest(BaseModel):
    frontImage: str
    additionalImages: list[AdditionalImage] = []

class AnalyzeResponse(BaseModel):
    faceType: str
    features: list[str]
    faceRatios: dict | None = None
    analysisId: str | None = None
```

### POST `/api/cards/hair` · `/api/cards/makeup` · `/api/cards/total`

```python
class CardsRequest(BaseModel):
    faceType: str
    personalColor: str | None
    features: list[str]
```

응답: 카드 4장 배열

### POST `/api/photo/generate`

```python
class PhotoRequest(BaseModel):
    frontImage: str
    card: dict

class PhotoResponse(BaseModel):
    generatedImage: str
```

---

## 2-3. Rate Limiting

```
비로그인(게스트)
- /api/analyze : 1회 / IP / 일
- /api/cards/* : 3회 / IP / 일
- /api/photo/* : 0회

로그인 유저
- /api/analyze : 5회 / 유저 / 일
- /api/cards/* : 15회 / 유저 / 일
- /api/photo/* : 3회 / 유저 / 일
```

- 초과 시 `429 Too Many Requests`
- 초기 구현: 메모리 + Supabase `usage_counters`
- 확장 시 Redis 검토

---

## 2-4. 프론트엔드 수정 사항

- [ ] 프론트의 AI 직접 호출을 모두 백엔드 엔드포인트 호출로 교체
- [ ] 환경변수 `VITE_API_URL` 추가
  - 로컬: `http://localhost:8000`
  - 개발/테스트 배포: Render URL
  - 출시 운영: Railway URL
- [ ] `VITE_GEMINI_API_KEY`, 기타 AI 키를 프론트에서 제거
- [ ] 웹과 Capacitor 앱이 동일한 `VITE_API_URL` 빌드값을 사용하도록 정리
- [ ] 실패 응답 포맷을 프론트 에러 UI에 맞게 통일

---

## 2-5. 배포 단계

### 1) 로컬 개발

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 2) 개발·테스트 배포: Render 무료

- 장점: 비용 0달러
- 단점: 15분 비활성 시 슬립
- 용도: 내부 QA, MVP 개발 확인, 모바일 실기기 테스트

필수 환경변수:

```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
```

### 3) 출시 직전/출시 초기: Railway Hobby

- 이유: 첫 요청 슬립 제거
- 비용: 월 $5~15 예상
- 조건: Play Store 제출 전 이전 완료

---

## 2-6. CORS 설정

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",       # 웹 개발
        "https://your-app.vercel.app", # 웹 프로덕션
        "capacitor://localhost",       # Capacitor iOS
        "http://localhost",            # Capacitor Android
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## 2-7. 테스트 전략

- [ ] `/api/analyze`, `/api/cards/*`, `/api/photo/generate` contract test 추가
- [ ] 게스트/로그인 권한 integration test 추가
- [ ] Rate limiting 초과 시 `429` 응답 테스트 추가
- [ ] 공통 에러 응답 포맷 회귀 테스트 추가
- [ ] Render staging smoke test 추가

---

## Phase 2 완료 기준 체크리스트

- [ ] 백엔드 서버 생성 및 로컬 실행 확인
- [ ] `/api/analyze` 엔드포인트 동작 확인
- [ ] `/api/cards/*` 엔드포인트 동작 확인
- [ ] `/api/photo/generate` 로그인 + 사용량 제한 체크 확인
- [ ] 프론트 환경변수에서 AI 키 완전 제거
- [ ] Rate limiting 적용 확인
- [ ] Render 무료 배포 완료
- [ ] Capacitor 앱에서 Render 백엔드 통신 확인
- [ ] Play Store 제출 전 Railway Hobby 이전 완료
- [ ] 개발자 도구와 앱 번들에서 API 키 노출 없음 확인
- [ ] 핵심 API contract/integration 테스트 그린
