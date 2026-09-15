---
last-verified: "2026-09-15"
---

# 🗺️ AI 뷰티 코치 — 전체 로드맵

> 최종 목표: Android 우선 출시 후 iOS 확장, 그리고 수익화까지 연결
> 작성일: 2026-03-04 (수정: 2026-05-07)

---

## 전체 단계 한눈에 보기

```
[v1.0 — Android 출시까지]
Phase 1 │ 얼굴 인식 정확도 + RAG 품질 (정확도 검증, 골든셋)
Phase 2 │ 백엔드 분리 + 보안 + 배포 기반 (FastAPI 셋업 포함)
Phase 3 │ 인증 + 유저 시스템
Phase 4 │ UI/UX 완성도
Phase 6 │ Capacitor 앱 패키징 + Android Play Store 출시

[v1.1 — 출시 후 수익화]
Phase 5 │ 수익화 시스템 (광고 + 카드 잠금)

[Phase 7 — iOS 후속 출시]
Phase 7 │ iOS 플랫폼 추가 + App Store 출시

Cross-cut │ 테스트 아키텍처 + 품질 게이트
```

> **순서 변경 요지**: 광고/카드 잠금은 첫 출시 리스크와 일정 부담을 키우므로 **v1.1로 분리**한다.
> Android 첫 출시(v1.0) → 광고·잠금 도입(v1.1) → iOS 출시(Phase 7) 순서로 간다.

| Phase | 핵심 목표 | 실행 계획 | 결정 기록 (ADR) | 시점 | 완료 기준 |
|-------|----------|----------|----------------|------|---------|
| 1 | 얼굴 인식 정확도 검증 (로컬 Python) + RAG 데이터 보강 | [0002](./plans/0002-phase1-face-accuracy-rag.md) | [0002](./decisions/0002-phase1-face-accuracy-rag.md) | v1.0 | 골든셋 자가평가 정확도 90% 이상 (10장 중 9장 납득) |
| 2 | FastAPI 백엔드 셋업 + AI 키 보호 + 배포 전환 | [0003](./plans/0003-phase2-backend-split.md) | [0003](./decisions/0003-phase2-backend-split.md) | v1.0 | API 키 클라이언트 노출 없음 |
| 3 | 로그인 + 히스토리 저장 | [0004](./plans/0004-phase3-auth-supabase.md) | [0004](./decisions/0004-phase3-auth-supabase.md) | v1.0 | 카카오/구글 로그인 + 내 기록 조회 |
| 4 | UI/UX 폴리싱 | [0005](./plans/0005-phase4-ux-design-system.md) | [0005](./decisions/0005-phase4-ux-design-system.md) | v1.0 | 디자인 시스템 확립 + 온보딩 완성 |
| 6 | Android 1차 출시 | [0006](./plans/0006-phase6-capacitor-android.md) | [0006](./decisions/0006-phase6-capacitor-android.md) | v1.0 | Play Store 출시 |
| 5 | 수익화 (광고 + 카드 잠금) — 쿠팡 정적 링크는 v1.0부터 | [0007](./plans/0007-phase5-monetization.md) | [0007](./decisions/0007-phase5-monetization.md) | v1.1 | 첫 수익 발생 |
| 7 | iOS 후속 출시 | [0008](./plans/0008-phase7-ios.md) | [0008](./decisions/0008-phase7-ios.md) | v1.2 | App Store 출시 |

---

## 현재 진행 상태

> **상세 체크리스트는 [`plans/`](./plans/README.md) 에 있다.** 여기는 큰 그림만 본다.
> 진행률은 `npm run plans:progress` 로 집계한다 — 이 표의 숫자를 손으로 고치지 마라.
> 엔드포인트 단위 현황은 [`connection-status.md`](./connection-status.md).

| Phase | 실행 계획 | 상태 | 남은 것 |
|-------|----------|------|--------|
| 1 정확도·RAG | [plan 0002](./plans/0002-phase1-face-accuracy-rag.md) | 🟡 도구 완비 | 골든셋·평가 도구 존재. **정확도 90% 달성 여부는 미측정** |
| 2 백엔드 분리 | [plan 0003](./plans/0003-phase2-backend-split.md) | 🟡 코드 완료 | 라우트 8개 + AI 키 백엔드 이동 완료. 실배포 미확인 |
| 3 인증·히스토리 | [plan 0004](./plans/0004-phase3-auth-supabase.md) | 🟡 코드 완료 | 코드 경로는 전부 연결. **Supabase 콘솔 설정·실기기 OAuth PoC 대기** |
| 4 UI/UX | [plan 0005](./plans/0005-phase4-ux-design-system.md) | 🟡 구현 완료 | 디자인 시스템 적용 완료. 사용자 직접 확인 항목 남음 |
| 6 Android 출시 | [plan 0006](./plans/0006-phase6-capacitor-android.md) | 🟡 진행 중 | 네이티브 브리지 4종 완료. **`.aab` 생성·Play Store 제출 남음** |
| 5 수익화 | [plan 0007](./plans/0007-phase5-monetization.md) | ⚪ 미착수 | v1.1. 쿠팡 링크 여는 경로만 선행 구현됨 |
| 7 iOS | [plan 0008](./plans/0008-phase7-ios.md) | ⚪ 미착수 | v1.2. Android 지표 확보 후 |

`🟢 완료 · 🟡 진행 중 · ⚪ 미착수`

Phase 에 속하지 않는 계획:

| 계획 | 상태 | 내용 |
|------|------|------|
| [plan 0001](./plans/0001-v10-release-criteria.md) | 🟡 진행 중 | v1.0 출시 기준 — 전 Phase 교차 |
| [plan 0009](./plans/0009-wireframe-review.md) | ⚪ 검토 전 | 최신 와이어프레임 구현 계획 (승인 시 ADR 로 결정을 남긴다) |

**품질 게이트 현황** — `npm run verify` (lint + test + docs:check) 통과.
상세는 [`test.md`](./test.md) 의 "출시 전 최소 품질 게이트".

---

## 우선순위 원칙

1. **신뢰도 먼저** — RAG 기반 추천과 얼굴형 분석 정확도가 핵심 가치다.
2. **보안 필수** — API 키는 Phase 2에서 반드시 백엔드로 이동한다.
3. **출시 비용은 단계적으로 올린다** — 개발·테스트는 `Render 무료`, 상용화 시작은 `Railway Hobby`, 성장기에는 `Railway Pro / Supabase Pro`로 전환한다.
4. **모바일은 재작성보다 재사용 우선** — React Native 별도 앱을 만들지 않고, 웹 코드를 `Capacitor`로 감싸 출시한다.
5. **수익화는 출시 이후로 미룬다** — 첫 출시 리스크와 광고 SDK 심사 부담을 줄이기 위해 v1.1에서 도입한다.
6. **출시 순서는 Android → 광고 → iOS** — Android 지표로 광고/UX 검증 후 iOS로 넓힌다.
7. **테스트는 개발과 같이 간다** — unit, contract, integration, e2e, AI eval, device QA를 phase별로 함께 추가한다.

---

## 운영 단계 기준

| 단계 | 인프라 전략 | 목표 비용 |
|------|------------|---------|
| 개발·테스트 | Render 무료 + Supabase 무료 | $0/월 |
| 출시 초기 (v1.0) | Railway Hobby + Supabase 무료 유지 | $5~15/월 |
| 성장기 (v1.1+) | Railway Pro + Supabase Pro + 스토리지 분리 검토 | 약 $48/월 |

---

## v1.0 출시까지 진행 순서 (의존성 그래프)

```
Phase 1 (정확도 검증 / 골든셋)
   └→ Phase 2 (FastAPI + Gemini 통합 + 키 보호)
        └→ Phase 3 (Auth + 히스토리)
             └→ Phase 4 (UX 완성)
                  └→ Phase 6 (Android 출시)
```

---

## MVP 정의

→ [`decisions/0001-mvp-scope-android-first.md`](./decisions/0001-mvp-scope-android-first.md) 참고

## 테스트 전략

→ [`test.md`](./test.md) 참고

## 각 Phase 상세

- **무엇을 할 것인가 (체크리스트)** → [`plans/`](./plans/README.md)
- **왜 그렇게 정했나 (배경)** → [`decisions/`](./decisions/README.md)

두 곳 모두 인덱스 표에서 Phase 번호로 찾을 수 있다.
ADR 본문에도 체크박스가 남아 있지만 **작성 당시 스냅샷**이다 — 실행 추적은 `plans/` 가 한다.
