# Phase 2 — 백엔드 셋업 + 보안

> 현재: AI API 키가 프론트에 노출될 수 있음
> 목표: FastAPI 백엔드를 처음부터 셋업하고, 모든 AI 호출을 백엔드로 이동한다.
> 배포는 `Render 무료 → Railway Hobby` 단계로 가져간다.

> Phase 1에서는 로컬 Python 스크립트로 정확도만 검증했다. 서버 자체는 Phase 2에서 처음 만든다.
> Phase 1 산출물(`tools/landmark.py`, Gemini 프롬프트 등)은 본 단계에서 `backend/services/` 모듈로 이관해 재사용한다.

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

- Phase 1: MediaPipe 측정과 Gemini 프롬프트를 **로컬 스크립트**로 검증
- Phase 2: 처음으로 FastAPI 서버를 만들고, Phase 1 산출물을 `services/` 모듈로 이관
- 동시에 인증, Rate Limit, 저장, 배포, 운영 구조까지 셋업한다

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
└── ios/                     ← Phase 7에서 생성
```

---

## 2-2. API 엔드포인트 설계

### POST `/api/analyze`

```python
class AdditionalImage(BaseModel):
    data: str       # base64
    angle: str      # "90도 측면 (프로필)" | "45도 반측면"

class AnalyzeRequest(BaseModel):
    frontImage: str                                  # base64
    additionalImages: list[AdditionalImage] = []

class AnalyzeResponse(BaseModel):
    faceType: str                                    # 7가지 얼굴형 또는 '판정 어려움'
    features: list[str]
    faceRatios: dict | None = None                   # MediaPipe 비율값
    analysisId: str | None = None                    # 로그인 유저만 발급
```

### POST `/api/cards/hair` · `/api/cards/makeup` · `/api/cards/total`

```python
class CardsRequest(BaseModel):
    analysisId: str | None = None                    # 로그인 유저는 필수, cards 테이블 INSERT용
    faceType: str
    personalColor: str | None
    features: list[str]
```

응답: 카드 4장 배열

### POST `/api/photo/generate`

```python
class PhotoRequest(BaseModel):
    analysisId: str                                  # 필수 (로그인 전용 엔드포인트)
    cardType: str                                    # 'hair' | 'total' (메이크업은 사진 생성 없음)
    card: dict                                       # 선택된 카드 페이로드

class PhotoResponse(BaseModel):
    generatedImage: str                              # storage URL
    cached: bool                                     # generated_photos UNIQUE 히트 시 true
```

> `frontImage`는 PhotoRequest에 포함하지 않는다. 백엔드가 `analyses.front_image_url`로 원본을 다시 가져와 Gemini에 전달한다.
> `(analysisId, cardType)`이 동일하면 `generated_photos` UNIQUE 제약에 의해 캐시 응답을 반환한다.

### POST `/api/history`

선택한 카드를 `cards` 테이블에 저장하는 엔드포인트 (로그인 전용).

```python
class HistorySaveRequest(BaseModel):
    analysisId: str
    cardType: str                                    # 'hair' | 'makeup' | 'total'
    cardData: dict                                   # styleLabel, recommendedProducts(makeup) 등 카드 페이로드 전체
```

### GET `/api/history`

내 분석 히스토리 목록 (로그인 전용, 최근 5회).

```python
class HistoryListItem(BaseModel):
    analysisId: str
    faceType: str
    personalColor: str | None
    cardTypes: list[str]                             # 저장된 카드 종류
    createdAt: datetime
    photoExpired: bool                               # front_image_url 만료 여부
```

### GET `/api/history/{analysisId}`

특정 분석의 카드 + 메타 상세 (로그인 전용).

```python
class HistoryDetailResponse(BaseModel):
    analysis: AnalyzeResponse
    cards: list[dict]                                # cards 테이블의 card_data 모음
    generatedPhotos: list[dict]                      # generated_photos 중 만료 안 된 것만
```

---

## 2-3. Rate Limiting

```
비로그인(게스트)
- /api/analyze : 1회 / IP / 일
- /api/cards/* : 3회 / IP / 일       (헤어/메이크업/종합 합산)
- /api/photo/* : 0회                  (사진 생성은 로그인 전용)

로그인 유저
- /api/analyze : 5회 / 유저 / 일
- /api/cards/* : 15회 / 유저 / 일     (분석당 3 종류 × 5회 분량)
- /api/photo/* : "분석당 카드 종류별 1회" + "일일 누적 5회 / 유저"
```

### 사진 생성 사용량 의미

- 사용자가 한 분석 결과에서 헤어 카드 사진 1장 + 종합 카드 사진 1장을 자연스럽게 받아볼 수 있도록 설계
- 같은 카드 종류 사진을 같은 분석 안에서 재요청하면 캐시된 응답을 반환 (백엔드는 Storage URL 재사용)
- 일일 누적 5회는 분석을 여러 번 다시 돌리는 케이스의 비용 가드
- 두 가드는 백엔드에서 모두 검사

### 운영 원칙

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

---

## 🙋 사용자 직접 테스트 체크리스트 (Phase 2)

### 키 노출 검증
- [ ] 브라우저 개발자 도구 → Network 탭에서 `/api/analyze` 요청 헤더/바디에 `GEMINI_API_KEY` 같은 문자열이 안 보이는가
- [ ] 빌드 결과(`npm run build` 후 `dist/` 또는 `.aab`)에서 `grep -ri "AIza\|sk-\|claude"` 같은 패턴이 안 잡히는가 (실제 키 prefix 기준)
- [ ] 페이지 소스 보기에서 어떤 AI 키도 노출되지 않는가

### Rate Limit 직접 시도
- [ ] 게스트(시크릿 창)로 `/api/analyze` 1회 성공 → 2회째 429 응답 확인
- [ ] 게스트로 `/api/cards/hair`, `/api/cards/makeup`, `/api/cards/total` 합산 4회째 429 확인
- [ ] 게스트로 `/api/photo/generate` 호출 시 401/403 거부 확인
- [ ] 로그인 후 `/api/photo/generate` 같은 (analysisId, cardType) 두 번째 호출 시 `cached: true`로 같은 URL 반환되는지
- [ ] 로그인 후 `/api/photo/generate` 일일 6회째 호출 시 안내 UI 노출

### 배포 환경
- [ ] Render URL 직접 호출 → 분석 성공 (개발 단계)
- [ ] Render 15분 슬립 후 첫 요청 시 응답 시간 체감 (느리면 Railway 이전 신호)
- [ ] Railway URL로 이전 후 슬립 없이 첫 요청 즉시 응답
- [ ] 배포 환경 환경변수에 모든 시크릿 키 등록 완료 (로컬 .env와 비교)

### 응답 무결성
- [ ] AnalyzeResponse에 `faceType`, `features`, `faceRatios`, `analysisId` 모두 들어오는가
- [ ] CardsRequest에 `analysisId` 누락 시 백엔드가 cards INSERT 안 하는지 (게스트 응답 vs 로그인 응답)
- [ ] `faceType`이 "판정 어려움"인 케이스 응답을 한 번이라도 받아봄
