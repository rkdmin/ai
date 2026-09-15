# 아키텍처 결정 기록 (ADR)

이 디렉토리는 **"왜 이렇게 했는가"** 를 남긴다. 원래 `phase1~7.md` 로 흩어져 있던 단계별 계획
문서를 번호가 붙은 append-only 기록으로 재배치한 것이다.

## 인덱스

| ADR | Phase | 마일스톤 | 결정 | 상태 |
|-----|-------|---------|------|------|
| [0001](./0001-mvp-scope-android-first.md) | — | v1.0 | 광고 없이 Android 1차 출시로 범위 확정 | Accepted |
| [0002](./0002-phase1-face-accuracy-rag.md) | 1 | v1.0 | 얼굴 인식 정확도·RAG 품질을 로컬 Python 으로 먼저 검증 | Accepted |
| [0003](./0003-phase2-backend-split.md) | 2 | v1.0 | FastAPI 백엔드 분리로 AI 키를 프론트에서 제거 | Accepted |
| [0004](./0004-phase3-auth-supabase.md) | 3 | v1.0 | Supabase 인증 + 분석 히스토리 저장 | Accepted |
| [0005](./0005-phase4-ux-design-system.md) | 4 | v1.0 | Beaumi 에디토리얼 디자인 시스템으로 UX 통일 | Accepted |
| [0006](./0006-phase6-capacitor-android.md) | 6 | v1.0 | Capacitor 로 패키징해 Play Store 1차 출시 | Accepted |
| [0007](./0007-phase5-monetization.md) | 5 | v1.1 | 수익화는 v1.1 로 연기 (광고 + 쿠팡파트너스) | Accepted |
| [0008](./0008-phase7-ios.md) | 7 | v1.2 | iOS 는 Android 지표 검증 후 후속 출시 | Accepted |

> ADR 번호는 **결정 시점 순서**다. Phase 번호와 어긋나는 구간이 있다 — Phase 6(Android 출시)을
> Phase 5(수익화)보다 먼저 하기로 결정했기 때문이다. 이 역전 자체가 0001·0007 의 결정 내용이다.

**진행 현황(어디까지 실제로 됐는가)은 여기서 관리하지 않는다.** 실행 추적은
[`../plans/`](../plans/README.md) 가 단일 출처이고, 큰 그림은 [`../ROADMAP.md`](../ROADMAP.md),
엔드포인트 단위는 [`../connection-status.md`](../connection-status.md) 를 본다.
ADR 의 `status` 는 "결정이 지금도 유효한가"만 나타낸다.

> ⚠️ **ADR 본문에 남아 있는 체크박스는 작성 당시 스냅샷이다.** append-only 규율상 갱신하지 않으므로
> 신뢰하지 마라. 같은 항목이 [`../plans/`](../plans/README.md) 에 살아 있는 체크리스트로 이관돼 있고,
> 두 곳이 어긋나면 plan 이 맞다.

## 규율

1. **Append-only.** 수락된(`Accepted`) ADR 의 본문은 고치지 않는다. 오타·죽은 링크 정정은 예외.
2. **번복은 새 ADR 로.** 결정을 뒤집으면 새 번호로 문서를 만들고,
   - 새 문서 frontmatter 에 `supersedes: ["0006"]`
   - 기존 문서 frontmatter 에 `superseded_by: ["0009"]` + `status: Superseded`
   를 함께 기록한다. 기존 본문은 지우지 않는다 — 왜 그렇게 판단했는지가 기록의 가치다.
3. **번호는 재사용하지 않는다.** 폐기된 ADR 도 번호를 유지한다.
4. **`status` 값은 셋뿐이다.** `Proposed` / `Accepted` / `Superseded`.
5. **새 ADR 을 추가하면 위 인덱스 표에 한 줄 추가한다.**

## frontmatter 형식

```yaml
---
adr: "0009"
title: "한 줄로 읽히는 결정 내용"
phase: 8            # 해당 Phase 가 없으면 null
milestone: "v1.2"
status: Accepted    # Proposed | Accepted | Superseded
date: "2026-08-01"
supersedes: []      # 이 결정이 대체하는 ADR 번호
superseded_by: []   # 이 결정을 대체한 ADR 번호
---
```

## 새 ADR 작성 시

파일명은 `NNNN-짧은-영문-슬러그.md`. Phase 단위 작업이면 슬러그에 `phaseN` 을 포함해
`0006-phase6-capacitor-android.md` 처럼 둔다 — Phase 번호로도 찾을 수 있게 하려는 것이다.
