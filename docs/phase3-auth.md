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

| 제공자 | 우선도 | 도입 시점 | 구현 방식 |
|--------|--------|---------|----------|
| 카카오 | MUST | v1.0 (Phase 3) | Supabase OAuth (현재 웹 redirect bridge 코드, Android 실기기에서 InAppBrowser 경로 검증 필요) |
| 구글 | MUST | v1.0 (Phase 3) | Supabase OAuth (현재 웹 redirect bridge 코드, 실기기 계정 선택/복귀 검증 필요) |
| 애플 | iOS 출시 시 MUST | Phase 7 | `@capacitor-community/apple-sign-in` |
| 네이버 | NICE | 출시 후 추가 검토 | — |

### 카카오 OAuth PoC (Phase 3 시작 전 1일)

카카오는 카카오톡 앱 deep link / 미설치 시 모바일 웹 폴백 / redirect URI 화이트리스트 등 함정이 많다.
Phase 3 본격 작업 전에 Android 실기기에서 다음 케이스를 PoC로 검증한다.

- 카카오톡 앱 설치 + 로그인 성공 콜백
- 카카오톡 앱 미설치 + 모바일 웹 폴백 콜백
- 백그라운드 → 포그라운드 복귀 시 세션 유지

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
face_type             text NOT NULL                    -- 7가지 얼굴형 또는 '판정 어려움'
face_ratios           jsonb                            -- MediaPipe 비율값 (디버깅/회귀용)
personal_color        text
features              text[]
front_image_url       text
-- side_image_urls    jsonb       -- v1.x 측면 재도입 시: [{"angle": "...", "url": "..."}]
created_at            timestamptz DEFAULT now()
photo_expires_at      timestamptz -- 사진 만료 시각 (분석 메타는 보존, photo URL만 NULL 처리)
```

> `face_type_confidence`는 보류. Gemini가 confidence를 안정적으로 반환하지 않으면 컬럼을 두지 않는다.
> 필요 시 Phase 1에서 Gemini 응답 스키마에 추가하고 본 컬럼을 다시 도입한다.

### `cards`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id  uuid REFERENCES analyses(id) ON DELETE CASCADE
card_type    text NOT NULL          -- 'hair' | 'makeup' | 'total'
card_data    jsonb NOT NULL         -- styleLabel, recommendedProducts(makeup만), Hero/HairStyle/Makeup/FeatureTip/CoachNote 등
created_at   timestamptz DEFAULT now()
```

### `feedback`

> 스키마만 선반영. 피드백 위젯 UI는 v1.0 제외(`phase1-quality.md` 1-5 참조)이며 v1.1 이후 도입한다.

```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id uuid REFERENCES analyses(id) ON DELETE CASCADE
card_id     uuid REFERENCES cards(id) ON DELETE CASCADE
type        text NOT NULL
detail      text
created_at  timestamptz DEFAULT now()
```

### `usage_counters` — 일일 누적 카운트

```sql
user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE
date           date NOT NULL
analyze_count  int DEFAULT 0
cards_count    int DEFAULT 0
photo_count    int DEFAULT 0
PRIMARY KEY (user_id, date)
```

### `generated_photos` — 분석당 카드 종류별 1회 가드

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id  uuid REFERENCES analyses(id) ON DELETE CASCADE
card_type    text NOT NULL          -- 'hair' | 'total'
storage_url  text NOT NULL
created_at   timestamptz DEFAULT now()
expires_at   timestamptz            -- created_at + 30일
UNIQUE (analysis_id, card_type)
```

> `UNIQUE (analysis_id, card_type)` 제약으로 "분석당 카드 종류별 1회" 정책을 DB 레벨에서 강제.
> 같은 (analysis, card_type) 재요청은 백엔드가 기존 레코드의 `storage_url`을 그대로 반환 (캐시 동작).
> 메이크업 카드는 사진 생성하지 않으므로 `card_type`은 `hair` / `total`만.

---

## 3-3. 프론트 인증 UI

### 현재 구현 메모 (2026-05-12)

- 로그인 컴포넌트는 `src/components/Login.jsx` 하나로 `login` / `guest_gate` 를 모두 처리한다.
- `src/utils/authBridge.js` 가 Supabase OAuth redirect hash 에서 access token 을 읽어 세션을 복원한다.
- 비로그인 사용자가 `history`, `my`, `history_detail` 에 접근하면 `guest_gate` 로 보내고, 로그인 후 원래 목적지로 복귀한다.
- 홈 recent 는 로그인 사용자만 `fetchHistory(3)` 를 호출한다. 게스트는 보호된 history fetch 없이 안내 카피만 본다.

### 로그인 화면

```
v1.0 (Android):
┌──────────────────────────────┐
│      💄 AI 뷰티 코치         │
│                              │
│  나에게 딱 맞는 헤어·메이크업│
│  스타일을 AI가 분석해드려요  │
│                              │
│  [카카오로 시작하기 🟡]      │
│  [구글로 시작하기  ⬜]       │
│                              │
│  ─────── 또는 ───────        │
│  [로그인 없이 1회 체험하기]  │
└──────────────────────────────┘

Phase 7 (iOS 출시) 추가:
│  [애플로 시작하기  ⬛]       │
```

### 파일 구성

```
src/
├── contexts/
│   └── AuthContext.jsx
├── components/
│   ├── Login.jsx
│   ├── Home.jsx
│   ├── History.jsx
│   └── HistoryDetail.jsx
└── utils/
    └── authBridge.js      ← OAuth redirect 세션 복원 + post-login return target 저장/소비
```

---

## 3-4. 히스토리 기능

### 히스토리 목록 화면 (`/history`)

- 최근 5회 표시
- 날짜 / 얼굴형 / 퍼스널컬러 / 카드 타입 요약
- 항목 선택 시 `history_detail` 로 진입
- `NEW ANALYSIS` CTA 로 새 분석 플로우 재진입

### 히스토리 상세 (`/history/:id`)

- 당시 분석 결과
- 생성된 카드 목록
- 저장된 헤어/메이크업 카드를 현재 카드 UI로 다시 열기
- 사진 만료 시 `"사진 만료"` 상태를 보여주고 카드 정보는 유지

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
- 사진 생성 가능 여부는 `usage_counters`(일일 누적) + `generated_photos`(분석당 카드 종류별 UNIQUE) + 로그인 상태로 확인

---

## 3-6. 분석 결과 저장 흐름

```
1. 프론트: 분석 완료
2. /api/analyze 호출 시 백엔드가:
   - 정면 사진을 Storage에 업로드 → analyses.front_image_url
   - analyses INSERT (expires_at = now + 90일 포함)
   - 응답에 analysisId 포함 (로그인 시)
3. 카드 생성 후 /api/cards/{hair|makeup|total} 응답 저장
4. 백엔드: cards INSERT (analysis_id 참조)
5. 사진 생성(/api/photo/generate) 시 generated_photos INSERT (UNIQUE 제약)
```

---

## 3-6a. 사진 보관 / 만료 정책

### 보관 기간

| 대상 | 정책 |
|------|------|
| 게스트 | Supabase Storage에 업로드하지 않는다. 분석 응답 즉시 폐기 |
| 로그인 유저 (정면 원본) | **90일 보관**. 만료 후 Storage에서 삭제 |
| 로그인 유저 (Gemini 생성 스타일 사진) | **30일 보관** (재생성 비용 낮음, 저장 부담 큼) |

### 운영 흐름

- INSERT 시 `analyses.photo_expires_at = created_at + 90일` 기록 (정면 원본 기준)
- 생성 사진은 `generated_photos.expires_at = created_at + 30일`로 관리
- 일 1회 cron이 만료 시각 지난 Storage 객체를 삭제
- 삭제 후 `analyses.front_image_url`은 NULL 처리 (분석 메타·카드 데이터는 보존)
- 히스토리 상세에서 사진이 만료된 항목은 `"사진이 만료되었습니다"` 안내 + 카드 정보만 표시

### 사용자 안내

- 회원가입 약관/개인정보 처리방침에 보관 기간 명시
- 히스토리 상세의 "내 사진 즉시 삭제"는 운영 정책 후보로 유지하되, 현재 UI/백엔드 모두 미구현

### 비용 가드

- 최근 1년 사용량을 기준으로 90일 보관 정책의 Storage 비용 추적
- Supabase 무료 티어 한도(현재 1GB) 초과 전에 보관 기간 단축 또는 Pro 전환 검토

---

## 3-7. 앱/웹 네비게이션 구조

```
현재 하단 탭바 4개:
  홈 탭       → 업로드 → 분석 → 결과 → 카드 → 카드 상세
  트렌드 탭   → 정적 mock 피드
  히스토리 탭 → 내 분석 기록 → 기록 상세
  마이 탭     → 계정/활동 mock 관리

인증 게이트:
  비로그인 → history / my / history_detail 접근 시 guest_gate
  로그인 성공 후 → 원래 탭 또는 기록 상세로 복귀

별도 화면:
  splash / onboarding / login / guest_gate
```

- 현재는 URL 라우터보다 `App.jsx` stage 상태로 웹/Capacitor 흐름을 공용 관리
- Android 하드웨어 back 도 같은 stage parent 규칙을 사용

---

## 3-8. 테스트 전략

- [x] OAuth redirect bridge / 세션 복원 / post-login return target 테스트 (`test/authBridge.test.js`)
- [x] 히스토리 목록 / 상세 UI 회귀 테스트 (`test/Home.test.jsx`, `test/History.test.jsx`, `test/HistoryDetail.test.jsx`)
- [ ] 게스트 → 로그인 전환 상위 흐름 회귀 테스트
- [ ] RLS 정책 SQL 테스트 또는 클라이언트 테스트 추가
- [ ] 로그인 사용자 사용량 제한 회귀 테스트 추가
- [ ] OAuth 복귀 플로우는 자동화보다 실기기 smoke test 항목으로 관리

---

## Phase 3 저장소/구현 기준 체크리스트

> 위 체크는 **코드/문서/저장소 기준으로 확인 가능한 항목**이다.
> Supabase 콘솔, 실기기 OAuth, 실제 계정 데이터 검증은 아래 `🙋 사용자 직접 테스트 체크리스트`에서 따로 체크한다.

- [x] Supabase Auth 연동 코드 추가 (`Authorization: Bearer` 검증, OAuth redirect bridge)
- [x] Supabase 테이블/RLS SQL 추가 (`backend/supabase_schema.sql`)
- [ ] Supabase Auth 콘솔 설정 완료 (Kakao/Google provider, redirect URL)
- [ ] 카카오 OAuth PoC 통과 (카카오톡 설치/미설치, 백그라운드 복귀)
- [ ] 카카오 OAuth + InAppBrowser 플로우 동작 확인 (현재 웹 redirect 기반 코드)
- [ ] 구글 로그인 동작 확인 (현재 웹 redirect 기반 코드)
- [x] 게스트 1회 체험 가능 (기존 IP rate limit 유지)
- [x] 로그인 시 분석 결과 자동 저장 (`/api/analyze` → `analyses`)
- [x] 카드 생성 시 카드 데이터 자동 저장 (`/api/cards/*` → `cards`)
- [x] 히스토리 목록 / 상세 조회 가능 (`GET /api/history`, `GET /api/history/{analysisId}`)
- [ ] 로그인/비로그인 Rate Limit 차등 적용 확인
- [x] RLS 정책 SQL 작성
- [ ] RLS로 본인 데이터만 조회 가능 확인 (Supabase 프로젝트 적용 후)
- [ ] 인증/RLS 테스트 그린 (실 Supabase 프로젝트 필요)

---

## 🙋 사용자 직접 테스트 체크리스트 (Phase 3)

### 카카오 로그인 — 디바이스 케이스 매트릭스
- [ ] Android 실기기 + 카카오톡 앱 설치된 상태 → 로그인 → 콜백 성공
- [ ] Android 실기기 + 카카오톡 앱 미설치(또는 다른 폰) → 모바일 웹 폴백 → 콜백 성공
- [ ] 로그인 도중 앱을 백그라운드로 보냈다 다시 포그라운드 → 세션 유지 또는 재시도 가능
- [ ] 카카오에서 "취소" 누른 경우 → 앱이 멈추지 않고 로그인 화면으로 복귀

### 구글 로그인
- [ ] 첫 로그인 시 구글 계정 선택 → 가입 → 분석 화면 진입
- [ ] 로그아웃 후 다시 같은 계정으로 로그인 → 기존 히스토리가 그대로 보이는가
- [ ] 구글 계정 2개로 각각 로그인해보고 데이터가 섞이지 않는가

### 게스트 흐름
- [ ] 시크릿 모드로 게스트 분석 1회 → 정상 동작
- [ ] 같은 IP로 두 번째 분석 시도 → "1회 한도" 안내 + 로그인 CTA
- [ ] 게스트가 "사진 생성하기" 누르면 로그인 CTA 모달

### 히스토리
- [ ] 로그인 후 분석 1회 → 히스토리 탭에 즉시 노출
- [ ] 분석을 6회 한 후 히스토리에 가장 오래된 1건이 빠지는지 (최근 5회)
- [ ] 홈 recent 카드 탭 → 기록 상세 진입 → 뒤로가기 시 홈으로 복귀
- [ ] 히스토리 항목 탭 → 기록 상세 진입 → 뒤로가기 시 히스토리로 복귀
- [ ] 히스토리 상세에서 HAIR / MAKEUP 다시 열기 → 저장된 카드 세트가 현재 UI로 정상 복원
- [ ] 91일 지난 분석을 강제로 만들어 (혹은 SQL로 `photo_expires_at`을 어제로 바꿔) cron 동작 후 사진 만료 안내가 노출되는지

### guest gate / 복귀
- [ ] guest 상태에서 history / my / history_detail 진입 시 진입 이유별 gate 카피가 맞게 보이는가
- [ ] gate 에서 로그인 성공 후 원래 보려던 탭 또는 기록 상세로 정확히 복귀하는가

### 보안
- [ ] 다른 계정 토큰으로 `/api/history` 호출 시 빈 응답 (RLS 동작)
- [ ] 로그아웃 직후 `/api/history` 호출 시 401
- [ ] 만료된 JWT로 호출 시 401
