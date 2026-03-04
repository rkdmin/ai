# Phase 3 — 인증 + 유저 시스템

> 목표: 카카오/구글 로그인 + 분석 히스토리 저장
> 선행 조건: Phase 2 백엔드 완료

---

## 왜 로그인이 필요한가

1. **Rate Limiting**: IP 기반보다 유저 기반이 정확함
2. **히스토리**: 이전 분석 결과를 다시 볼 수 있어야 함
3. **수익화 연동**: 유저별 사용량 추적, 향후 유료 플랜 도입 기반
4. **쿠팡 파트너스**: 클릭 추적을 유저와 연결 가능
5. **앱 스토어**: 로그인 없는 앱은 심사에서 기능 제한 지적 받을 수 있음

---

## 3-1. 인증 전략

### Supabase Auth 사용 (추천)
- 카카오, 구글 OAuth 기본 제공
- Apple Sign In (iOS 출시 필수) 지원
- JWT 자동 발급 및 검증
- 추가 서버 코드 최소화

### OAuth 제공자 우선순위
| 제공자 | 우선도 | 이유 |
|--------|--------|------|
| 카카오 | MUST | 한국 사용자 1순위 |
| 구글 | MUST | 범용 + Android 기본 |
| 애플 | MUST | iOS 출시 필수 조건 |
| 네이버 | NICE | 한국 2순위, 나중에 추가 |

### 게스트 모드
- 로그인 없이 1회 체험 가능
- 히스토리 저장 없음
- Rate limit: IP 기반 제한 (엄격하게)
- 체험 후 로그인 유도 CTA 표시

---

## 3-2. Supabase 설정

### 테이블 설계

#### `users` (Supabase Auth 자동 생성)
```sql
id          uuid PRIMARY KEY
email       text
created_at  timestamptz
```

#### `analyses` (분석 히스토리)
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE
face_type       text NOT NULL          -- 계란형, 둥근형 등
face_type_confidence  int             -- AI 분석 신뢰도 0~100
personal_color  text                  -- spring_warm 등 (nullable)
features        text[]                -- ['눈 간격 넓음', '광대 넓음']
front_image_url text                  -- Supabase Storage URL (30일 보관)
created_at      timestamptz DEFAULT now()
```

#### `cards` (생성된 카드)
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id  uuid REFERENCES analyses(id) ON DELETE CASCADE
card_type    text NOT NULL   -- 'hair' | 'makeup' | 'total'
card_data    jsonb NOT NULL  -- 카드 4장 전체 JSON
created_at   timestamptz DEFAULT now()
```

#### `feedback` (사용자 피드백)
```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
analysis_id   uuid REFERENCES analyses(id) ON DELETE CASCADE
card_id       uuid REFERENCES cards(id) ON DELETE CASCADE (nullable)
type          text NOT NULL  -- 'face_type_correct' | 'face_type_wrong' | 'card_helpful' | 'card_not_helpful'
detail        text           -- 부가 설명 (틀린 이유 등)
created_at    timestamptz DEFAULT now()
```

#### `usage_counters` (Rate Limiting)
```sql
user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE
date        date NOT NULL
analyze_count  int DEFAULT 0
cards_count    int DEFAULT 0
photo_count    int DEFAULT 0
PRIMARY KEY (user_id, date)
```

### RLS (Row Level Security)
```sql
-- analyses: 본인 데이터만 조회/삽입
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can read own analyses"
  ON analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can insert own analyses"
  ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 3-3. 프론트엔드 인증 UI

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
│   └── AuthContext.jsx     ← 로그인 상태 전역 관리
├── components/
│   ├── LoginPage.jsx       ← 로그인 화면
│   ├── Header.jsx          ← 상단 네비게이션 (로그인 상태 표시)
│   └── HistoryPage.jsx     ← 히스토리 목록
```

---

## 3-4. 히스토리 기능

### 히스토리 목록 화면 (`/history`)

```
┌──────────────────────────────┐
│  ← 내 분석 기록              │
├──────────────────────────────┤
│  [2026.03.04]               │
│  계란형 · 봄 웜톤            │
│  헤어 + 메이크업 카드        │
│  → 다시 보기                │
├──────────────────────────────┤
│  [2026.02.28]               │
│  계란형 · (퍼컬 미확인)      │
│  헤어 카드                   │
│  → 다시 보기                │
└──────────────────────────────┘
최근 5회 표시 (MVP)
```

### 히스토리 상세 (`/history/:id`)
- 당시 분석 결과 (얼굴형, 퍼컬, 이목구비)
- 생성된 카드 목록 다시 표시
- 사진은 URL 만료 시 "사진이 만료되었습니다" 표시

---

## 3-5. 백엔드 인증 미들웨어

**파일:** `backend/src/middleware/auth.js`

```js
// JWT 검증 미들웨어
async function verifyToken(request, reply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    // 게스트 모드 허용 엔드포인트는 통과
    if (request.routeOptions.config.guestAllowed) return
    return reply.status(401).send({ error: '로그인이 필요합니다' })
  }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error) return reply.status(401).send({ error: '유효하지 않은 토큰' })
  request.user = user
}
```

---

## 3-6. 분석 결과 저장 흐름

```
1. 프론트: 분석 완료
2. 백엔드 /api/analyze 응답에 analysis_id 포함 (로그인 시)
3. 프론트: 카드 생성 후 /api/history에 저장 요청
4. 백엔드: analyses + cards 테이블에 INSERT
5. 이미지: Supabase Storage에 업로드 (30일 보관)
```

---

## 3-7. 앱 네비게이션 구조

```
하단 탭바 3개:
  홈 탭       → 업로드 → 분석 → 결과 → 카드 → 카드 상세
  트렌드 탭   → 뷰티 트렌드 피드 (얼굴형/퍼컬 필터)
  히스토리 탭 → 내 분석 기록 (로그인 필요)

탭 외 화면:
  /login         → 로그인 화면
  /history/:id   → 히스토리 상세 (카드 목록 재표시)
```

React Navigation (Bottom Tabs + Stack) 사용

---

## Phase 3 완료 기준 체크리스트

- [ ] Supabase 프로젝트 생성 및 테이블 설계 완료
- [ ] 카카오 OAuth 로그인 동작 확인
- [ ] 구글 OAuth 로그인 동작 확인
- [ ] 애플 로그인 동작 확인
- [ ] 게스트 모드 1회 체험 가능
- [ ] 로그인 시 분석 결과 자동 저장
- [ ] 히스토리 목록 조회 가능
- [ ] 히스토리 상세에서 카드 다시 보기 가능
- [ ] 로그인/비로그인 Rate Limit 차등 적용 확인
- [ ] RLS 설정으로 본인 데이터만 조회 확인
