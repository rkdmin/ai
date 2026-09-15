---
plan: "0008"
title: "Phase 7 — iOS 후속 출시"
phase: 7
adr: ["0008"]
milestone: "v1.2"
status: Proposed
last-verified: "2026-09-15"
---
# Plan 0008 · Phase 7 — iOS 후속 출시

> 결정 배경: [ADR 0008](../decisions/0008-phase7-ios.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

App Store 출시.

## 구현

### 7-3. iOS 전용 점검 항목
- [ ] iOS safe area (상하) 처리 회귀 점검
- [ ] WKWebView에서의 카메라 권한 / `accept="image/*;capture=camera"` 동작 확인
- [ ] InAppBrowser 카카오 로그인 콜백 (Universal Links) 검증
- [ ] iOS Share Sheet (`@capacitor/share`) 동작 확인
- [ ] iPhone SE / 14 / 14 Pro Max 레이아웃 점검
- [ ] App Tracking Transparency 정책 검토 (광고 도입 시)

### 7-5. 스토어 준비물 (iOS)
- [ ] Apple Developer 계정
- [ ] Apple Sign In 구성
- [ ] App Store Connect 메타데이터
- [ ] 6.5인치 / 5.5인치 스크린샷
- [ ] 개인정보 처리 라벨 (Privacy Nutrition Label)
- [ ] 광고 사용 시 ATT 안내

### 7-6. 테스트 전략
- [ ] iOS device smoke checklist 별도 유지
- [ ] TestFlight 베타 1주 운영
- [ ] 카메라 / OAuth / 공유 / 외부 링크 실기기 회귀

### 핵심 체크
- [ ] iOS 플랫폼 추가 완료
- [ ] Apple Sign In 동작 확인
- [ ] 카메라 / 공유 / 외부 링크 iOS 동작 확인
- [ ] TestFlight 베타 통과
- [ ] App Store 심사 통과
- [ ] iOS device smoke test 통과

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

### 디바이스 매트릭스 (실기기 또는 시뮬레이터)
- [ ] iPhone SE (4.7"·소형) → 모든 화면 잘림 없음
- [ ] iPhone 14 (6.1"·기본) → 노치/다이내믹 아일랜드 영역 침범 없음
- [ ] iPhone 14 Pro Max (6.7"·대형) → 큰 화면에서 카드 비례 자연스러움
- [ ] iPad → 모바일 레이아웃이 깨지지 않음 (필수는 아님)

### 권한·카메라
- [ ] 카메라 권한 첫 요청 → "허용" → 정상 촬영
- [ ] 카메라 권한 거부 → 갤러리 폴백 동작 + 설정 안내
- [ ] 사진 라이브러리 권한 거부 후 다시 요청 흐름

### 인증
- [ ] Apple Sign In 첫 가입 → "Hide My Email" 케이스도 동작
- [ ] 같은 Apple ID로 재로그인 시 기존 히스토리 유지
- [ ] 카카오 로그인 → InAppBrowser → Universal Links 콜백 → 세션 복귀
- [ ] 구글 로그인 iOS에서도 동작

### iOS 전용 UX
- [ ] safe area (상단 노치 + 하단 홈 인디케이터)에 콘텐츠/탭바가 가려지지 않음
- [ ] iOS Share Sheet로 카드 이미지 공유 → 인스타·카카오톡·메모로 정상 전달
- [ ] 시스템 다크모드 ON/OFF 시 깨지는 화면 없음 (지원 명시 안 했어도 점검)
- [ ] 키보드 올라올 때 입력 필드가 가려지지 않음

### 광고 (v1.1+ 도입 후)
- [ ] App Tracking Transparency 다이얼로그가 처음 1회 노출
- [ ] ATT "허용 안 함" 선택해도 앱이 동작 (보상형 광고는 일반 광고로 fallback)

### 출시 준비물 점검
- [ ] App Store Connect 메타데이터·스크린샷 등록
- [ ] Privacy Nutrition Label에 사진/계정 데이터 항목 정확히 표시
- [ ] TestFlight 베타로 1주간 본인 + 지인 테스트 후 크래시 0
- [ ] App Store 심사 통과 (1차 거부 시 거부 사유별 대응)
