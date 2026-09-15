---
name: docs-audit
description: 문서가 코드와 어긋났는지 점검하고 고친 뒤 last-verified 를 갱신한다. npm run docs:check 가 잡는 기계적 오류(죽은 링크·유령 필드·YAML)를 먼저 통과시키고, 스크립트가 원리적으로 못 잡는 산문 주장("~는 mock 이다", "~는 미구현")을 코드와 직접 대조한다. 사용 시점은 docs:check 가 last-verified 경과를 경고할 때, 기능을 크게 바꾼 뒤, 커밋·배포 전 문서 신뢰도를 확인할 때. 호출 트리거 예: "/docs-audit", "문서 점검해줘", "문서 낡은 거 확인해줘", "docs check 돌려줘".
---

# docs-audit — 문서가 아직 사실인지 확인한다

## 목적

`npm run docs:check` 는 **기계적으로 검증 가능한 것**만 본다. 죽은 링크, 백엔드에 없는 API 필드,
`.claude/rules/` YAML 유효성, ADR 규율, `last-verified` 경과일.

정작 실제로 사고를 냈던 종류는 그게 아니다. `connection-status.md` 가 2.5개월간
`ShareCard` 를 "no-op", `My.jsx` 를 "전체 mock" 이라고 적어둔 채 방치됐는데, 둘 다 이미
구현되어 있었다. **이런 산문 주장은 스크립트가 원리적으로 못 잡는다** — 코드를 읽고 비교해야 한다.

이 스킬이 그 부분을 담당한다. 스크립트가 기계 검사를, 이 절차가 판단을 맡는다.

## 절차

### 1. 기계 검사부터 통과시킨다

```bash
npm run docs:check
```

`FAIL` 이 있으면 먼저 고친다. 여기서 걸리는 건 대부분 명백한 오류다 (링크가 죽었거나,
문서가 백엔드에 없는 필드를 계약으로 적었거나, ADR 번호가 겹쳤거나).

`WARN` 으로 나오는 `last-verified` 경과 문서가 **이번 점검의 대상**이다.

### 2. 대상 문서의 "사실 주장"을 뽑는다

문서에서 아래 형태의 문장을 찾는다. 전부 코드로 참/거짓을 가릴 수 있는 것들이다.

- "`X` 는 mock 이다" / "no-op 이다" / "미구현이다"
- "`X` 가 `Y` 를 호출한다" / "연결됨" / "호출자 없음"
- "`X` 필드를 반환한다"
- "`X` 는 `Y` 에 있다" (경로·파일 주장)
- 체크박스 `- [x]` / `- [ ]`

### 3. 각 주장을 코드와 대조한다

주장 유형별로 확인 방법이 정해져 있다. **추측하지 말고 실제로 열어본다.**

| 주장 | 확인 방법 |
|------|----------|
| 엔드포인트 존재 | `grep -rn "@router\." backend/routes/` |
| 프론트 클라이언트 함수 | `grep -n "export .*function" src/api/backend.js` |
| UI 호출 지점 | `grep -n "<함수명>" src/App.jsx src/components/` |
| "mock 이다" | 해당 컴포넌트를 열어 실제 데이터 소스 확인 (`MOCK` 상수인지 API·세션인지) |
| "no-op 이다" | 해당 핸들러 본문 확인 — 실제 구현이 붙었는지 |
| 응답 필드 존재 | `grep -rn "필드명" backend/services/ backend/models/` |
| 네이티브 브리지 | `src/utils/` · `src/hooks/` 에 해당 모듈이 있는지 + `isNativePlatform()` 분기 유무 |

**최근 커밋을 함께 본다** — 문서가 낡는 가장 흔한 경로다.

```bash
git log --oneline -15
```

### 4. 어긋난 것을 고친다

- 문서가 틀렸으면 **문서를 고친다** (코드가 진실이다).
- 고칠 때 "이번 작업으로 연결함" 같은 **작업 로그 서술을 넣지 않는다.** 현재 상태 문서는
  "지금 무엇이 어떤 상태인가" 만 담는다. 경위는 `docs/decisions/` 와 git 이력의 몫이다.
- 아직 구현되지 않은 것을 계약처럼 적지 않는다. `api-contract.md` 는 해당 절 제목에
  `미구현` 을 넣어야 `docs:check` 가 그 블록을 검사에서 뺀다.

### 5. `last-verified` 를 갱신한다 — 확인한 것만

```yaml
---
last-verified: "YYYY-MM-DD"
---
```

> ⚠️ **실제로 코드와 대조한 문서만 날짜를 올린다.**
> 확인하지 않고 날짜만 올리면 그 문서는 "검증됨" 으로 위장한 채 영원히 낡는다.
> 경고가 계속 뜨는 게, 검증했다고 거짓 기록하는 것보다 낫다.
> 일부만 확인했으면 올리지 말고, 무엇을 확인하고 무엇을 못 했는지 사용자에게 보고한다.

### 6. 마무리

```bash
npm run docs:check
```

`FAIL 0` 을 확인한다. `WARN` 은 남아 있어도 된다 — 아직 대조하지 못한 문서가 있다는 정직한 신호다.

## 점검 대상 문서

`docs:check` 의 `LIVE_DOCS` 목록(`scripts/docs-check.mjs`)이 기준이다. 현재:

| 문서 | 무엇을 주장하나 | 대조 대상 |
|------|----------------|----------|
| `AGENTS.md` | 다른 에이전트(Codex 등)가 지킬 규칙과 **직접 실행해야 할 검사 명령** | `.claude/hooks/` · `.claude/settings.json` · `package.json` scripts |
| `docs/plans/README.md` | plan 인덱스와 규약 | `docs/plans/*.md` 실제 목록 · `npm run plans:progress` |
| `docs/connection-status.md` | 엔드포인트별 연결/미연결 상태 | `backend/routes/` · `src/api/` · `src/App.jsx` |
| `docs/ui-flow.md` | 화면 흐름, 컴포넌트 동작·조건·state | `src/App.jsx` 의 view case · `src/components/` |
| `docs/test.md` | 테스트 구조, 품질 게이트 | `test/` · `backend/test_*.py` · `package.json` scripts |
| `docs/ROADMAP.md` | Phase 진행 상태 | git log · `connection-status.md` |

## 하지 말 것

- **`docs/decisions/` 의 ADR 을 갱신하지 마라.** append-only 다. 낡아 보이는 게 정상이며,
  결정이 바뀌었으면 새 ADR 을 추가한다. 죽은 링크 정정만 예외.
- **커밋되지 않은 변경 위에서 `git checkout --` 이나 `git stash` 를 쓰지 마라.**
  문서 점검에 필요 없는 명령이고, 사용자의 작업 중인 파일을 되돌릴 수 있다.
- 확인하지 않은 문서의 `last-verified` 를 올리지 마라 (위 5번).
- **plan 의 체크박스를 임의로 체크하지 마라.** 코드로 확인한 항목만 체크하고, 근거를 항목 옆에 남긴다.
  확신이 없으면 그대로 두는 게 맞다 — 가짜 진행률이 낡은 문서보다 나쁘다.

## plan 을 볼 때 (`docs/plans/`)

`npm run plans:progress` 가 번호·인덱스·`status` 정합성을 이미 검사한다. 스크립트가 못 보는 것은 이것이다.

- **체크된 항목이 정말 끝났는가.** `- [x]` 인데 코드에 없는 경우를 찾는다. 특히 ADR 에서 이관된
  항목은 작성 당시 기준이라, 이후 코드가 바뀌어 다시 미완료가 된 것이 있을 수 있다.
- **미체크 항목 중 이미 끝난 것.** 작업만 하고 체크를 안 한 경우가 잦다.
- **취소 항목에 이유가 있는가.** `~~취소선~~` 만 긋고 이유를 안 적으면 다음 사람이 다시 논의하게 된다.
- **`status` 가 현실과 맞는가.** 전부 체크됐는데 `In Progress` 면 스크립트가 잡지만, 반대로
  한 항목도 진행 안 했는데 `In Progress` 인 것은 사람이 판단해야 한다.

## AGENTS.md 를 볼 때 특히 확인할 것

이 파일은 **Claude Code 가 아닌 도구의 유일한 진입점**이라, 여기가 틀리면 그 세션 전체가 잘못된
전제로 간다. 그런데 `.claude/` 안의 자동 로드 자산을 우리가 매일 쓰다 보니 **"자동으로 되는 것"과
"Claude Code 에서만 자동인 것"을 혼동한 서술이 쌓이기 쉽다.** 실제로 "hook 이 에이전트 종류와
무관하게 적용된다"는 틀린 문장이 한 달 넘게 남아 있었다 (링크는 멀쩡해 `docs:check` 가 못 잡는다).

- hook·skill·`.claude/rules/` 를 "자동"이라고 쓴 문장이 있으면, **Claude Code 전용임이 명시돼 있는지** 본다.
- 안내된 수동 검사 명령이 `package.json` 의 scripts 에 실제로 있는지 확인한다.
- `.claude/skills/` 목록이 실제 디렉토리와 맞는지 본다.

## 참고

- 기계 검사 구현: `scripts/docs-check.mjs`
- 문서 지도: `docs/README.md`
- 갱신 규칙 표: `CLAUDE.md` 의 "문서 업데이트 규칙"
