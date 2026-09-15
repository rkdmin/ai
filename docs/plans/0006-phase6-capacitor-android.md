---
plan: "0006"
title: "Phase 6 — Android 1차 출시"
phase: 6
adr: ["0006"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0006 · Phase 6 — Android 1차 출시

> 결정 배경: [ADR 0006](../decisions/0006-phase6-capacitor-android.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

Play Store 출시.

## 구현

### 6-7. 스토어 준비물 (Android)
- [ ] Google Play Console 계정
- [ ] 개인정보처리방침 URL
- [ ] 앱 설명 / 키워드 / 카테고리
- [ ] 스크린샷
- [ ] 데이터 보안 설문

### 6-9. 테스트 전략
- [ ] Capacitor 브리지별 device smoke checklist 유지
- [ ] 카메라 / OAuth / 공유 / 외부 링크 실기기 테스트
- [ ] Play Console Pre-launch Report 확인
- [ ] release candidate마다 smoke test 재실행

### 핵심 체크
- [x] Capacitor 초기 세팅 완료 (`capacitor.config.json` — appId `app.beaumi.coach` / appName `Beaumi` / webDir `dist`)
- [x] Android 플랫폼 생성 완료 (`npx cap add android` — `android/` 스캐폴딩, target/compileSdk 36)
- [ ] 카메라 업로드 동작 확인 — 브리지 구현 + 에뮬레이터 네이티브 피커 열림 확인 완료, 실폰 실제 촬영 검증만 남음
- [ ] 결과 카드 공유 동작 확인 — 브리지 구현 + 에뮬레이터 네이티브 공유 시트(이미지 첨부) 열림 확인 완료, 실폰 SNS 전달만 남음
- [ ] 카카오 / 구글 로그인 동작 확인
- [ ] 쿠팡 외부 링크 동작 확인 — 브리지 구현(@capacitor/browser) 완료, mock 에 URL 없어 실 backend/실폰에서 시스템 브라우저 오픈 확인 필요
- [ ] Render 백엔드로 실기기 QA 완료
- [ ] Railway Hobby 이전 완료
- [ ] Android Studio signed `.aab` 생성 성공
- [ ] Play Store 심사 통과
- [ ] Android device smoke test 통과

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

### 사전 빌드 검증
- [ ] `npm run build` 후 `npx cap sync android` → 에러 없이 완료
- [ ] Android Studio에서 signed `.aab` 빌드 성공
- [ ] 빌드 결과물 크기가 적정 (대략 < 30MB)
- [ ] 빌드 산출물에서 `grep -ri "AIza\|Bearer "` 같은 시크릿 흔적 없음

### 실기기 (내부 테스트 트랙)
- [ ] Play Console 내부 테스트 트랙으로 본인 폰에 설치
- [ ] 첫 실행 → 온보딩 → 카메라 권한 허용 → 분석까지 30초 이내
- [ ] 카메라로 직접 촬영 → 사진이 정상으로 전달
- [ ] 갤러리에서 사진 선택 → 동일하게 분석 성공
- [ ] 카카오 로그인 → 카카오톡 앱 → 콜백 성공
- [ ] 구글 로그인 → 콜백 성공
- [ ] 카드 이미지 공유 → 카카오톡/인스타로 정상 전달
- [ ] 메이크업 카드 → 쿠팡 외부 링크 → 크롬 또는 기본 브라우저로 열림
- [ ] 백그라운드 → 포그라운드 복귀 시 분석 결과 유지

### 오류·안정성
- [ ] 오프라인 상태로 분석 시도 → 네트워크 안내
- [ ] 30분 사용해도 메모리 증가/렉 없음
- [ ] Sentry 대시보드에서 첫 사용 후 크래시 0건
- [ ] Play Console Pre-launch Report 모든 ANR/크래시 0
- [ ] 알림창에 앱 권한 외 추가로 요청되는 권한 없는지

### 출시 준비물 점검
- [ ] 앱 아이콘이 다양한 런처에서 깨지지 않음
- [ ] 스플래시 화면이 자연스럽게 사라짐
- [ ] 개인정보처리방침 URL이 실제 도메인에서 200 응답
- [ ] 스토어 등록 스크린샷이 실제 화면과 일치
