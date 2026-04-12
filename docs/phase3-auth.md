# Phase 3 — 인증 + 유저 시스템

> 목표: 카카오/구글 로그인 + 분석 히스토리 저장
> 선행 조건: Phase 2 백엔드 완료

---

## 왜 로그인이 필요한가

1. **Rate Limiting 정교화** — IP 기반보다 유저 단위 제어가 정확하다.
2. **히스토리 저장** — 이전 분석 결과와 카드 기록을 다시 볼 수 있어야 한다.
3. **생성 사용량 관리** — 비용 높은 사진 생성 기능을 유저 단위로 제한할 수 있어야 한다.
4. **개인화 확장** — 추후 트렌드 추천, 리포트, 추천 로그를 붙이기 쉽다.

---

## 3-1. 인증 전략

### Supabase Auth 사용

- 카카오 OAuth 지원
- 구글 OAuth 지원
- Apple Sign In 연동 가능
- JWT 발급 / 검증 흐름이 단순함

### 제공자별 구현 전략

| 제공자 | 우선도 | 구현 방식 |
|--------|--------|----------|
| 카카오 | MUST | Supabase OAuth + Capacitor InAppBrowser |
| 구글 | MUST | `@codetrix-studio/capacitor-google-auth` |
| 애플 | iOS 출시 시 MUST | `@capacitor-community/apple-sign-in` |
| 네이버 | NICE | 출시 후 추가 검토 |

### 게스트 모드

- 로그인 없이 1회 체험 가능
- 히스토리 저장 없음
- IP 기반 Rate limit 적용
- 체험 종료 후 로그인 CTA 표시

---

## 3-2. Supabase 데이터 구조

### `analyses`

```sql
id                    uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE
face_type             text NOT NULL
face_type_confidence  int
personal_color        text
features              text[]
front_image_url       text
created_at            timestamptz DEFAULT now()
```

### `cards`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id  uuid REFERENCES analyses(id) ON DELETE CASCADE
card_type    text NOT NULL
card_data    jsonb NOT NULL
created_at   timestamptz DEFAULT now()
```

### `feedback`

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE
card_id     uuid REFERENCES cards(id) ON DELETE CASCADE
type        text NOT NULL
detail      text
created_at  timestamptz DEFAULT now()
```

### `usage_counters`

```sql
user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE
date           date NOT NULL
analyze_count  int DEFAULT 0
cards_count    int DEFAULT 0
photo_count    int DEFAULT 0
PRIMARY KEY (user_id, date)
```

---

## 3-3. 프론트 인증 UI

### 로그인 화면

```
┌──────────────────────────────┐
│      💄 AI 뷰티 코치         │
│                              │
│  나에게 딱 맞는 헤어·메이크업│
│  스타일을 AI가 분석해드려요  │
│                              │
│  [카카오로 시작하기 🟡]      │
│  [구글로 시작하기  ⬜]       │
│  [애플로 시작하기  ⬛]       │
│                              │
│  ─────── 또는 ───────        │
│  [로그인 없이 1회 체험하기]  │
└──────────────────────────────┘
```

### 파일 구성

```
src/
├── contexts/
│   └── AuthContext.jsx
├── components/
│   ├── LoginPage.jsx
│   ├── Header.jsx
│   └── HistoryPage.jsx
└── utils/
    └── authBridge.js      ← Capacitor 전용 브리지 로직
```

---

## 3-4. 히스토리 기능

### 히스토리 목록 화면 (`/history`)

- 최근 5회 표시
- 날짜 / 얼굴형 / 퍼스널컬러 / 카드 타입 요약
- 항목 선택 시 당시 카드 목록 재표시

### 히스토리 상세 (`/history/:id`)

- 당시 분석 결과
- 생성된 카드 목록
- 사진 만료 시 `"사진이 만료되었습니다"` 표시

---

## 3-5. 백엔드 인증 미들웨어

**파일:** `backend/middleware/auth.py`

```python
from fastapi import Header, HTTPException

async def require_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="로그인이 필요합니다")

    token = authorization.replace("Bearer ", "")
    user = verify_supabase_token(token)  # 서비스 함수에서 검증
    if not user:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")

    return user
```

- 게스트 허용 엔드포인트는 별도 dependency로 분리
- 사진 생성 가능 여부는 `usage_counters`와 로그인 상태로 확인

---

## 3-6. 분석 결과 저장 흐름

```
1. 프론트: 분석 완료
2. /api/analyze 응답에 analysisId 포함 (로그인 시)
3. 카드 생성 후 /api/history 저장
4. 백엔드: analyses + cards INSERT
5. 사진은 Supabase Storage에 업로드, URL만 DB 저장
```

---

## 3-7. 앱/웹 네비게이션 구조

```
하단 탭바 3개:
  홈 탭       → 업로드 → 분석 → 결과 → 카드 → 카드 상세
  트렌드 탭   → 개인화 뷰티 피드
  히스토리 탭 → 내 분석 기록

별도 화면:
  /login
  /history/:id
```

- 동일한 React 라우팅 구조를 웹과 Capacitor 앱이 공유
- React Navigation 도입 없이 현재 웹 라우팅/상태 구조를 확장하는 방향을 우선 검토

---

## 3-8. 테스트 전략

- [ ] 로그인 권한/세션 로직 테스트
- [ ] 게스트 → 로그인 전환 회귀 테스트
- [ ] RLS 정책 SQL 테스트 또는 클라이언트 테스트 추가
- [ ] 로그인 사용자 사용량 제한 회귀 테스트 추가
- [ ] OAuth 복귀 플로우는 자동화보다 실기기 smoke test 항목으로 관리

---

## Phase 3 완료 기준 체크리스트

- [ ] Supabase Auth 설정 완료
- [ ] 카카오 OAuth + InAppBrowser 플로우 동작 확인
- [ ] 구글 로그인 동작 확인
- [ ] 애플 로그인 준비 완료 (iOS 출시 전)
- [ ] 게스트 1회 체험 가능
- [ ] 로그인 시 분석 결과 자동 저장
- [ ] 히스토리 목록 / 상세 조회 가능
- [ ] 로그인/비로그인 Rate Limit 차등 적용 확인
- [ ] RLS로 본인 데이터만 조회 가능 확인
- [ ] 인증/RLS 테스트 그린
