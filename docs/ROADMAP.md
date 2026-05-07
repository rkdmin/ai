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

| Phase | 핵심 목표 | 세부 계획 파일 | 시점 | 완료 기준 |
|-------|----------|--------------|------|---------|
| 1 | 얼굴 인식 정확도 검증 (로컬 Python) + RAG 데이터 보강 | `phase1-quality.md` | v1.0 | 골든셋 자가평가 정확도 90% 이상 (10장 중 9장 납득) |
| 2 | FastAPI 백엔드 셋업 + AI 키 보호 + 배포 전환 | `phase2-backend.md` | v1.0 | API 키 클라이언트 노출 없음 |
| 3 | 로그인 + 히스토리 저장 | `phase3-auth.md` | v1.0 | 카카오/구글 로그인 + 내 기록 조회 |
| 4 | UI/UX 폴리싱 | `phase4-ux.md` | v1.0 | 디자인 시스템 확립 + 온보딩 완성 |
| 6 | Android 1차 출시 | `phase6-mobile.md` | v1.0 | Play Store 출시 |
| 5 | 수익화 (광고 + 카드 잠금) — 쿠팡 정적 링크는 v1.0부터 | `phase5-monetization.md` | v1.1 | 첫 수익 발생 |
| 7 | iOS 후속 출시 | `phase7-ios.md` | v1.2 | App Store 출시 |

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

→ `MVP.md` 참고

## 테스트 전략

→ `test.md` 참고

## 각 Phase 상세

→ `phase1-quality.md`, `phase2-backend.md`, `phase3-auth.md`, `phase4-ux.md`, `phase5-monetization.md`, `phase6-mobile.md`, `phase7-ios.md`
