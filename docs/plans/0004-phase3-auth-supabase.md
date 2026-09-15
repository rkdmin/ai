---
plan: "0004"
title: "Phase 3 — 인증 + 히스토리"
phase: 3
adr: ["0004"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0004 · Phase 3 — 인증 + 히스토리

> 결정 배경: [ADR 0004](../decisions/0004-phase3-auth-supabase.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

카카오/구글 로그인 + 내 기록 조회가 동작한다.

## 구현

### 3-8. 테스트 전략
- [x] OAuth redirect bridge / 세션 복원 / post-login return target 테스트 (`test/authBridge.test.js`)
- [x] 히스토리 목록 / 상세 UI 회귀 테스트 (`test/Home.test.jsx`, `test/History.test.jsx`, `test/HistoryDetail.test.jsx`)
- [ ] 게스트 → 로그인 전환 상위 흐름 회귀 테스트
- [ ] RLS 정책 SQL 테스트 또는 클라이언트 테스트 추가
- [ ] 로그인 사용자 사용량 제한 회귀 테스트 추가
- [ ] OAuth 복귀 플로우는 자동화보다 실기기 smoke test 항목으로 관리

### 핵심 체크
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

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

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
