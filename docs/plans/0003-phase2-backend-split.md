---
plan: "0003"
title: "Phase 2 — 백엔드 분리 + 보안"
phase: 2
adr: ["0003"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0003 · Phase 2 — 백엔드 분리 + 보안

> 결정 배경: [ADR 0003](../decisions/0003-phase2-backend-split.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

API 키가 클라이언트에 노출되지 않는다.

## 구현

### 2-4. 프론트엔드 수정 사항
- [x] 프론트의 AI 직접 호출을 모두 백엔드 엔드포인트 호출로 교체
- [x] 환경변수 `VITE_API_URL` 추가
- [x] `VITE_GEMINI_API_KEY`, 기타 AI 키를 프론트에서 제거
- [ ] 웹과 Capacitor 앱이 동일한 `VITE_API_URL` 빌드값을 사용하도록 정리
- [ ] 실패 응답 포맷을 프론트 에러 UI에 맞게 통일

### 2-7. 테스트 전략
- [x] `/api/analyze`, `/api/cards/*`, `/api/photo/generate` contract test 추가
- [x] 게스트/로그인 권한 integration test 추가
- [x] Rate limiting 초과 시 `429` 응답 테스트 추가 (`test_integration.py` — analyze 2회째 429, cards 4회째 429, photo 게스트 401)
- [x] 공통 에러 응답 포맷 회귀 테스트 추가 (`test_integration.py` — HTTPException→`{"detail": str}`, 검증 실패→`{"detail": [..]}`, Gemini 실패 400/503)
- [ ] Render staging smoke test 추가

### 핵심 체크
- [ ] 백엔드 서버 생성 및 로컬 실행 확인
- [x] `/api/analyze` 엔드포인트 동작 확인
- [x] `/api/cards/*` 엔드포인트 동작 확인
- [ ] `/api/photo/generate` 로그인 + 사용량 제한 체크 확인
- [x] 프론트 환경변수에서 AI 키 완전 제거
- [ ] Rate limiting 적용 확인
- [ ] Render 무료 배포 완료
- [ ] Capacitor 앱에서 Render 백엔드 통신 확인
- [ ] Play Store 제출 전 Railway Hobby 이전 완료
- [ ] 개발자 도구와 앱 번들에서 API 키 노출 없음 확인
- [x] 핵심 API contract/integration 테스트 그린 (`test_integration.py` 13개 통과)

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

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
