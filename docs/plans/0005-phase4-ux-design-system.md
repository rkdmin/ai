---
plan: "0005"
title: "Phase 4 — UI/UX 완성도"
phase: 4
adr: ["0005"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0005 · Phase 4 — UI/UX 완성도

> 결정 배경: [ADR 0005](../decisions/0005-phase4-ux-design-system.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

디자인 시스템 확립 + 온보딩 완성.

## 구현

### 핵심 체크
- [x] 홈 recent가 실제 히스토리를 반영한다
- [x] dead button이 없다 (Phase 4 범위에서 플래그된 dead 버튼 모두 제거: `Trend` search / `My` settings / `MakeupDetail` 더보기)
- [x] result 화면의 primary CTA가 하나로 읽힌다 (헤어=1차 dark CTA / 메이크업=2차 outline CTA + 로그인 시 SAVED 배지)
- [x] hair / makeup 상세의 sticky CTA 목적이 분명하다 (CardDetail: 합성 전=합성 보기 1차 / 합성 후=결과 공유 1차·다시 보기 2차 조건 분기. MakeupDetail: dead 더보기 버튼 제거)
- [x] history row 클릭 시 상세 진입이 된다
- [x] guest gate가 진입 이유별로 다른 문구를 보여준다
- [x] share 카드가 실제 결과 이미지를 반영한다 (합성 사진 있으면 before/after 비교형으로 실제 photoUrl·synthesizedPhoto 반영, 없으면 결과 카드형 / 저장=1차·외부 공유=2차 CTA)
- [x] trend 탭은 실데이터가 없으면 노출을 줄인다 (mock 피드 전체 제거 → "준비 중" 경량 화면 + START ANALYSIS CTA)
- [x] my 페이지는 mock 과장이 줄어든다 (fake stats·유저 퍼스널컬러·dead 메뉴 제거, 프로필은 세션 JWT email/provider 실데이터화)
- [x] 주요 empty / error / loading 상태 문구가 통일된다 (공용 `src/components/common/StateNotice.jsx` 로 구조 통일 + 톤 규칙 적용)

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

### 9.1 지금 사용자가 직접 체크해야 하는 것
- [x] Phase 4 범위 dead 버튼 정리 완료 — `My` settings(gear) 제거, `Trend` search 제거(준비중 경량화), `MakeupDetail` `+ 파트별 추천 제품 더보기` 제거(onSynthesize 오연결)
- [ ] 홈 recent 카드에서 상세 진입 후 뒤로가기 시 `home` 으로 복귀하는지 실기기/브라우저에서 확인
- [ ] 히스토리 목록에서 상세 진입 후 뒤로가기 시 `history` 로 복귀하는지 확인
- [ ] guest 상태에서 `history`, `my`, 홈 recent 관련 진입 시 reason 맞는 gate 카피가 나오는지 확인
- [ ] 로그인 직후 원래 보려던 탭 또는 기록 상세로 정확히 복귀하는지 확인
- [ ] 저장된 헤어 카드를 히스토리 상세에서 다시 열고 `TRY ON` 이 같은 분석 기준으로 동작하는지 확인
- [ ] `AnalysisResult` 에서 사용자가 hair 와 makeup 중 어디를 먼저 눌러야 하는지 망설이지 않는지 직접 써보고 판단
- [ ] `CardDetail` / `MakeupDetail` 하단 sticky CTA 가 실제 우선순위와 맞는지 사용 흐름으로 확인
- [ ] 공유 카드가 실제 합성 결과/상세 상태를 충분히 반영하는지 확인
- [ ] 로딩/에러/empty 문구 톤이 화면별로 어색하게 섞이지 않는지 쭉 훑어보기
