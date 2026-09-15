---
plan: "0001"
title: "v1.0 출시 기준"
phase: null
adr: ["0001"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0001 — v1.0 출시 기준

> 결정 배경: [ADR 0001](../decisions/0001-mvp-scope-android-first.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

아래 항목이 모두 체크되면 Play Store 제출이 가능하다.

## 구현

### 핵심 기능
- [x] 정면 사진 업로드 (1장, 측면은 v1.x 검토)
- [x] MediaPipe(백엔드) + Gemini 2.5 Flash 얼굴형 분석
- [x] 퍼스널컬러 확정 흐름 (알면 선택 / 모르면 건너뛰기 또는 질문 흐름)
- [ ] RAG 기반 헤어 / 메이크업 / 종합 카드 4장 생성
- [x] 카드 상세 + 전문가 코멘트
- [ ] 헤어 / 종합 추천 카드 적용 사진 생성 (사용량 제한)
- [ ] 메이크업 카드 추천 제품 + 쿠팡파트너스 링크 (정적 URL)

### 보안 / 백엔드
- [x] AI API 키를 백엔드로 완전 이동 (Claude → Gemini 단일 통합 포함)
- [ ] `Render 무료`로 개발·테스트 배포 확인
- [ ] 출시 직전 `Railway Hobby`로 이전해 슬립 없는 운영 환경 확보
- [ ] Rate Limiting 적용 (게스트 / 로그인 차등)

### 인증
- [ ] 카카오 로그인: Supabase OAuth + InAppBrowser 플로우 동작 확인
- [ ] 구글 로그인: Supabase OAuth redirect 복귀 동작 확인
- [x] 게스트 1회 체험

### 히스토리
- [ ] 분석 결과 저장 (로그인 시 자동)
- [ ] 최근 5회 조회
- [ ] 사진 보관 정책 적용 (로그인 90일, 만료 시 안내)

### 바이럴
- [ ] 결과 카드 이미지 저장/공유 (`html2canvas` + `@capacitor/share`)
- [ ] 감성 얼굴형 레이블 (`styleLabel`)
- [ ] 무드 키워드 레이블 (`moodLabel`) — 연예인 비교는 퍼블리시티권 회피로 금지, 무드 아키타입으로 대체
- [ ] 전후 비교 토글 (헤어/종합 추천 카드 한정)

### 운영 / 관측
- [ ] 이벤트 트래킹 도구 도입 (PostHog 단일 통일 — 웹+Capacitor 퍼널/리텐션)
- [ ] v1.0부터 추적할 이벤트: `makeup_product_block_view`, `coupang_link_click`, `generated_photo_created`, `generated_photo_limit_hit`
- [ ] Sentry 런타임 오류 수집 활성화

### 앱 패키징
- [ ] Capacitor 초기 세팅 (`npx cap init`)
- [ ] **Android 플랫폼 추가 및 실기기 테스트 완료** (iOS는 Phase 7)
- [ ] 앱 아이콘 / 스플래시 설정
- [ ] 개인정보처리방침 페이지
- [ ] Play Store 제출용 `.aab` 생성

### 테스트 / 품질 게이트
- [ ] 프론트 unit test 기본 세트 구축 (`Vitest`)
- [ ] 백엔드 API contract/integration test 구축 (`pytest + TestClient`)
- [ ] 핵심 사용자 플로우 E2E 1~2개 구축 (`Playwright`)
- [ ] 얼굴형/카드 품질 eval 데이터셋 10~15장 구축
- [ ] Android 실기기 smoke test 통과

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

### 핵심 체크
- [ ] 홈 recent 1~3개가 로그인 사용자에게만 노출되고, 게스트는 로그인 유도 카피만 보는지 확인
- [ ] 홈 recent → 기록 상세 → 뒤로가기 복귀가 `home` 으로 정확히 동작하는지 확인
- [ ] 히스토리 목록 → 기록 상세 → 뒤로가기 복귀가 `history` 로 정확히 동작하는지 확인
- [ ] guest gate 로그인 후 원래 보려던 탭 또는 기록 상세로 정확히 돌아오는지 확인
- [ ] 히스토리 상세에서 저장된 헤어 카드 재오픈 후 `TRY ON` 이 같은 분석 기준으로 동작하는지 확인
