# 🗺️ AI 뷰티 코치 — 전체 로드맵

> 최종 목표: Android 우선 출시 후 iOS 확장, 그리고 수익화까지 연결
> 작성일: 2026-03-04

---

## 전체 단계 한눈에 보기

```
Phase 1 │ 얼굴 인식 정확도 + RAG 품질
Phase 2 │ 백엔드 분리 + 보안 + 배포 기반
Phase 3 │ 인증 + 유저 시스템
Phase 4 │ UI/UX 완성도
Phase 5 │ 수익화 시스템
Phase 6 │ Capacitor 앱 패키징 + 스토어 출시
Cross-cut │ 테스트 아키텍처 + 품질 게이트
```

| Phase | 핵심 목표 | 세부 계획 파일 | 완료 기준 |
|-------|----------|--------------|---------|
| 1 | 얼굴 인식 정확도 개선 + RAG 데이터 보강 | `phase1-quality.md` | 사용자 자가평가 정확도 80% 이상 |
| 2 | 백엔드 API 서버 분리 + 키 보호 + 배포 전환 준비 | `phase2-backend.md` | API 키 클라이언트 노출 없음 |
| 3 | 로그인 + 히스토리 저장 | `phase3-auth.md` | 카카오/구글 로그인 + 내 기록 조회 |
| 4 | UI/UX 폴리싱 | `phase4-ux.md` | 디자인 시스템 확립 + 온보딩 완성 |
| 5 | 수익화 (광고 + 제휴) | `phase5-monetization.md` | 첫 수익 발생 |
| 6 | Android 우선 앱 출시 | `phase6-mobile.md` | Play Store 출시, iOS 후속 준비 완료 |

---

## 우선순위 원칙

1. **신뢰도 먼저** — RAG 기반 추천과 얼굴형 분석 정확도가 핵심 가치다.
2. **보안 필수** — API 키는 Phase 2에서 반드시 백엔드로 이동한다.
3. **출시 비용은 단계적으로 올린다** — 개발·테스트는 `Render 무료`, 상용화 시작은 `Railway Hobby`, 성장기에는 `Railway Pro / Supabase Pro`로 전환한다.
4. **모바일은 재작성보다 재사용 우선** — React Native 별도 앱을 만들지 않고, 웹 코드를 `Capacitor`로 감싸 출시한다.
5. **수익화는 UX를 해치지 않게** — 광고와 제휴는 추천 신뢰도를 침범하지 않는 위치에 둔다.
6. **테스트는 개발과 같이 간다** — unit, contract, integration, e2e, AI eval, device QA를 phase별로 함께 추가한다.

---

## 운영 단계 기준

| 단계 | 인프라 전략 | 목표 비용 |
|------|------------|---------|
| 개발·테스트 | Render 무료 + Supabase 무료 | $0/월 |
| 출시 초기 | Railway Hobby + Supabase 무료 유지 | $5~15/월 |
| 성장기 | Railway Pro + Supabase Pro + 스토리지 분리 검토 | 약 $48/월 |

---

## MVP 정의

→ `MVP.md` 참고

---

## 테스트 전략

→ `test.md` 참고

---

## 각 Phase 상세

→ `phase1-quality.md` ~ `phase6-mobile.md` 참고
