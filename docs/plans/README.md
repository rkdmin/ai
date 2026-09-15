---
last-verified: "2026-09-15"
---

# 실행 계획 (Plans)

이 디렉토리는 **"무엇을 어떤 순서로 할 것인가"** 를 담는다. 상세 체크리스트가 여기 있고,
**살아 있는 문서**다 — 항목이 끝나면 체크하고, 접었으면 취소선을 긋는다.

## 세 종류 문서의 경계

한 가지를 세 군데에 적지 않는다. 성격이 다르면 사는 곳도 다르다.

| 질문 | 어디 | 갱신 |
|------|------|------|
| **왜 그렇게 정했나** | [`../decisions/`](../decisions/README.md) (ADR) | append-only. 번복은 새 ADR |
| **무엇을 어떤 순서로 할 것인가** | 여기 (`plans/`) | 수시. 체크·취소선으로 상태를 남긴다 |
| **전체가 어디까지 왔나** | [`../ROADMAP.md`](../ROADMAP.md) | 큰 그림과 plan 별 진행률만 |

> **ADR 본문의 체크박스는 작성 당시 스냅샷이다.** 실행 추적의 단일 출처는 여기다.
> ADR 은 append-only 라 그 체크박스를 갱신하지 않는다 — 두 곳이 어긋나면 plan 이 맞다.

## 인덱스

| Plan | Phase | 마일스톤 | 내용 | 근거 ADR | 상태 |
|------|-------|---------|------|---------|------|
| [0001](./0001-v10-release-criteria.md) | — | v1.0 | v1.0 출시 기준 (전 Phase 교차) | [0001](../decisions/0001-mvp-scope-android-first.md) | In Progress |
| [0002](./0002-phase1-face-accuracy-rag.md) | 1 | v1.0 | 얼굴 인식 정확도 + RAG 품질 | [0002](../decisions/0002-phase1-face-accuracy-rag.md) | In Progress |
| [0003](./0003-phase2-backend-split.md) | 2 | v1.0 | 백엔드 분리 + 보안 | [0003](../decisions/0003-phase2-backend-split.md) | In Progress |
| [0004](./0004-phase3-auth-supabase.md) | 3 | v1.0 | 인증 + 히스토리 | [0004](../decisions/0004-phase3-auth-supabase.md) | In Progress |
| [0005](./0005-phase4-ux-design-system.md) | 4 | v1.0 | UI/UX 완성도 | [0005](../decisions/0005-phase4-ux-design-system.md) | In Progress |
| [0006](./0006-phase6-capacitor-android.md) | 6 | v1.0 | Android 1차 출시 | [0006](../decisions/0006-phase6-capacitor-android.md) | In Progress |
| [0007](./0007-phase5-monetization.md) | 5 | v1.1 | 수익화 (광고 + 카드 잠금) | [0007](../decisions/0007-phase5-monetization.md) | Proposed |
| [0008](./0008-phase7-ios.md) | 7 | v1.2 | iOS 후속 출시 | [0008](../decisions/0008-phase7-ios.md) | Proposed |
| [0009](./0009-wireframe-review.md) | — | 미정 | 최신 와이어프레임 구현 계획 | — | Proposed |

> plan 번호는 **만든 순서**다. Phase 번호와 어긋나는 구간이 있다 (0006=Phase 6, 0007=Phase 5).
> Phase 로 찾을 때는 위 표의 Phase 열을 본다. 현재는 우연히 ADR 번호와 1:1로 맞지만
> **보장되는 규칙은 아니다** — 연결은 frontmatter 의 `adr` 필드가 한다.

## 체크 표기 규약

```markdown
- [ ] 아직 안 한 것
- [x] 끝난 것
- [ ] ~~접은 것~~ — 취소: 이유를 반드시 남긴다
```

- **취소는 지우지 말고 취소선으로 남긴다.** 왜 안 하기로 했는지가 다음 사람에게 필요하다.
- 취소 항목은 진행률 계산에서 **분모에서 빠진다** (`npm run plans:progress`).
- 취소 사유가 결정 수준이면 ADR 도 함께 남긴다. 체크리스트 한 줄로 끝날 일이면 여기까지만.

## frontmatter

```yaml
---
plan: "0003"                 # 파일명 앞 번호와 같아야 한다
title: "Phase 2 — 백엔드 분리 + 보안"
phase: 2                     # 해당 Phase 가 없으면 null
adr: ["0003"]                # 근거가 된 결정. 없으면 []
milestone: "v1.0"
status: In Progress          # Proposed | In Progress | Done | Cancelled
last-verified: "2026-09-15"
---
```

`status` 는 넷뿐이다.

| 값 | 뜻 |
|----|-----|
| `Proposed` | 아직 승인·착수 전. 제안 단계 |
| `In Progress` | 착수했고 남은 항목이 있다 |
| `Done` | 취소를 뺀 모든 항목이 체크됐다 |
| `Cancelled` | 계획 자체를 접었다. 본문 맨 위에 이유를 남긴다 |

## 규율

1. **번호는 재사용하지 않는다.** 취소된 plan 도 번호를 유지한다.
2. **새 plan 을 추가하면 위 인덱스 표에 한 줄 추가한다.**
3. **`status` 와 체크 상태가 어긋나면 안 된다.** 전부 체크됐는데 `In Progress` 면
   `npm run docs:check` 가 잡는다. 반대도 마찬가지다.
4. **진행 상황을 ROADMAP 에 중복해 적지 않는다.** ROADMAP 은 plan 을 가리키기만 한다.
5. 승인된 제안(`Proposed` → `In Progress`)의 **결정 자체는 ADR 로 남긴다.** plan 은 실행 목록이다.

## 진행률 보기

```bash
npm run plans:progress
```

plan 별 체크 현황과 `status` 정합성을 출력한다. `npm run docs:check` 도 같은 검사를 포함한다.
