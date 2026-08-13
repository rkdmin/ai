# AI 마크다운 컨텍스트 관리 가이드 (풀스택/모노레포)

> **이 파일이 곧 방법론이다.** 새 프로젝트 루트(또는 `docs/`)에 이 파일 하나만 넣고, AI 에이전트에게
> **"이 가이드대로 md 관리를 세팅해줘"**라고 지시하면 아래 구조가 그대로 적용된다.
> 특정 프로젝트에 종속되지 않은 도구 중립 표준이며, 풀스택/모노레포를 기준으로 예시를 든다.
>
> 근거: Anthropic 공식 문서·엔지니어링 블로그, agents.md(Linux Foundation), Cursor·Copilot·Cline·Kiro
> 공식 문서 (2026년 기준, 하단 [출처](#출처)). 검증된 사실만 담았다.

---

## 0. 관통 원칙 — 컨텍스트는 "예산"이다

> 항상 로드되는 파일의 모든 토큰은 매 세션 **실제 작업과 같은 예산을 두고 경쟁**한다.
> 창이 찰수록 성능이 떨어진다(**context rot**). 그래서 모든 규칙은 한 방향으로 수렴한다 —
> **"항상 로드는 최소로, 나머지는 필요할 때만(just-in-time)."**

세 줄 요약:
1. **항상 로드**(AGENTS.md/CLAUDE.md)에는 *짧고 항상 참인 사실*만.
2. *조건부·특정 영역/패키지* 규칙은 **경로 스코프**로 → 해당 영역 만질 때만 로드.
3. *절차·강제·라이브 데이터·역할*은 각각 **Skill·Hook·MCP·Output style**로 → 항상-로드 파일에 넣지 않는다.

---

## 1. 파일 지도 (모노레포 기준)

```
<repo>/
├── AGENTS.md                    # ★ 루트 공통 SoT. 순수 md. 모든 에이전트·모든 툴이 읽음
├── CLAUDE.md                    # 얇은 진입점: `@AGENTS.md` + Claude 전용 포인터 (< 200줄)
├── CLAUDE.local.md              # (gitignore) 개인 지침 — 공유 안 함
├── CONVENTIONS.md               # (선택) 공통 코드 스타일이 크면 분리해 @import
├── .claude/
│   ├── rules/                   # 경로 스코프 규칙 — paths: frontmatter로 조건부 로드
│   │   ├── frontend.md          #   paths: ["packages/web/**", "apps/*/src/**"]
│   │   ├── backend.md           #   paths: ["packages/api/**", "services/**"]
│   │   └── shared.md            #   paths: ["packages/shared/**"]
│   ├── skills/                  # 다단계 절차(배포·릴리스·리뷰) — 호출 시에만 로드
│   ├── agents/                  # 서브에이전트(격리 컨텍스트 곁가지 작업)
│   └── settings.json            # 권한(permissions)·훅(hooks) — 강제 규칙
├── packages/
│   ├── web/
│   │   └── AGENTS.md            # 패키지 전용 지침 (모노레포: "가장 가까운 파일이 이김")
│   └── api/
│       └── AGENTS.md
└── docs/                        # (선택) 장문 지식·결정 기록 — 필요해질 때만
    └── decisions/               #   ADR(append-only). 아래 §7 참조
```

**계층 = 로딩 방식**이 다르다:
| 파일 | 언제 로드되나 | 비용 |
|---|---|---|
| 루트 `AGENTS.md`/`CLAUDE.md` | 매 세션 전체 | 비쌈 → 짧게 |
| `.claude/rules/*.md` (`paths:`) | 매칭 파일 읽을 때만 | 조건부 → 상세 OK |
| 패키지별 `AGENTS.md` | 그 패키지에서 작업할 때 (nearest-wins / 하위 CLAUDE.md는 on-demand) | 국소적 |
| `skills`/`agents` | 호출·관련성 판단 시 | 지연 |
| `docs/` | 에이전트가 능동 조회 | 필요 시만 |

---

## 2. "무엇을 어디에" 결정표 ★핵심

항상-로드 파일에 뭐든 넣으려는 충동을 이 표로 거른다.

| 넣으려는 내용 | ❌ 아님 | ✅ 올바른 위치 |
|---|---|---|
| 항상 참인 짧은 사실(스택, 기본과 다른 컨벤션, 빌드·테스트 명령) | — | **AGENTS.md** (루트 공통 / 패키지 전용) |
| 특정 영역·패키지에만 맞는 상세 규칙 | 루트에 두면 매 세션 낭비 | **`.claude/rules/*.md` + `paths:`** |
| 다단계 절차(배포·릴리스·리뷰 체크리스트) | 절차는 "사실"이 아님 | **Skill** (`.claude/skills/<n>/SKILL.md`) |
| "매번 X 하면 반드시 Y"(edit 후 lint 등) | 비결정적, 무시될 수 있음 | **Hook** (settings.json, PostToolUse 등) |
| "절대 X 금지"(main push, .env 수정, rm -rf) | 항상-로드 파일은 강제 못 함 | **`permissions.deny`** 또는 PreToolUse hook(exit 2) |
| 페르소나·출력형식("항상 도표부터") | 역할 변경은 지식 아님 | **Output style** (또는 `--append-system-prompt`) |
| 외부 라이브 데이터(이슈, DB 스키마, 대시보드) | 붙여넣기 금물(즉시 낡음) | **MCP 서버** (`.mcp.json`) |
| 에이전트가 스스로 배운 것(빌드 quirk, flaky 테스트) | 손으로 쓸 필요 없음 | **Auto memory** (`memory/MEMORY.md` 인덱스) |
| 길고 가끔 필요한 배경·아키텍처 결정 | 항상-로드 파일 오염 | **docs/** (필요 시 조회, §7) |
| 탐색·로그분석 등 결과를 안 볼 곁가지 작업 | 메인 창 오염 | **Subagent** (`.claude/agents/`) |

---

## 3. 모노레포 스코프 전략 (풀스택 핵심)

패키지가 여럿이면 "루트 공통 + 패키지별 특수"를 **두 메커니즘**으로 나눈다. 둘을 함께 쓴다:

### (A) AGENTS.md — 크로스툴, "가장 가까운 파일이 이김"
- 루트 `AGENTS.md` = 전 패키지 공통(모노레포 개요, 워크스페이스 툴, 공통 컨벤션).
- 각 패키지 `packages/<x>/AGENTS.md` = 그 패키지 전용. 에이전트는 **작업 파일에서 가장 가까운 AGENTS.md**를 우선한다(표준 내장 스코핑).
- Codex·Cursor·Copilot 등 25+ 도구가 이 규칙을 그대로 따른다 → 크로스툴 이식성 최대.

### (B) `.claude/rules/*.md` + `paths:` — Claude Code 전용, 더 견고
- Claude Code는 **AGENTS.md를 자동으로 안 읽는다**(§4). 그래서 Claude용 패키지별 규칙은 루트 `.claude/rules/`에
  `paths:` 글롭으로 둔다:
  ```markdown
  ---
  paths: ["packages/api/**", "services/**"]
  ---
  # 백엔드 작업 규칙
  ...
  ```
- **하위 CLAUDE.md보다 path-scoped rules를 권장**: 하위 디렉토리 CLAUDE.md는 on-demand 로드되지만
  `/compact` 후엔 재주입되지 않는다(루트 CLAUDE.md만 재주입). path-scoped rules는 매칭 시 재주입되어 더 안정적.
- 넓은 공통 룰 1개(frontmatter 없음=항상) + 좁은 패키지별 룰 N개(paths)로 중첩한다.

> 요약: **크로스툴 지식은 AGENTS.md(nearest-wins), Claude 심화 규칙은 `.claude/rules/`(paths).** 둘은 상호 보완.

---

## 4. AGENTS.md ↔ CLAUDE.md 연결 (반드시)

- ⚠️ **검증된 사실**: Claude Code는 **CLAUDE.md만 읽고 AGENTS.md는 자동으로 읽지 않는다.** 그냥 두면 두 파일이 따로 논다.
- **연결 방법**: 루트 `CLAUDE.md` 첫 줄에 **`@AGENTS.md`** import (전 플랫폼 안전, Windows 포함).
  - `@import`는 **정리용이지 토큰 절감이 아니다** — import 파일도 launch 시 전부 로드된다. 절감은 rules/skills/subagents 같은 지연 로딩만.
  - symlink(`ln -s AGENTS.md CLAUDE.md`)도 가능하나 Windows는 관리자 권한 필요 → **import를 기본**으로.
- 패키지별로 Claude에도 nearest 지침을 주고 싶으면 `packages/<x>/CLAUDE.md`에 `@AGENTS.md`(그 패키지 것)를 import(on-demand),
  또는 (B)의 path-scoped rules로 대체.

---

## 5. 템플릿 (복붙용)

### 5-1. 루트 `AGENTS.md`
```markdown
# <프로젝트명> Agent Guide (monorepo)

## 프로젝트 요약
<무엇을 하는가 / 독특한 실행·배포 모델 한두 문단>

## 워크스페이스 맵
- `packages/web`  : <프론트엔드 역할, 스택>
- `packages/api`  : <백엔드 역할, 스택>
- `packages/shared`: <공유 타입/유틸>
- `apps/*`        : <배포 단위>

## 공통 빌드 / 테스트 / 실행
- 설치: `<pkg-manager> install`  (예: pnpm)
- 전체 빌드: `<cmd>`
- 전체 테스트: `<cmd>`  (커밋 전 반드시)
- 특정 패키지만: `<workspace filter cmd>`

## 공통 코드 컨벤션 (기본과 다른 것만)
<들여쓰기·따옴표·네이밍 등. 린터가 강제하는 건 생략. 크면 `@CONVENTIONS.md`로 분리>

## 저장소 규칙
- 브랜치/PR/커밋 메시지 규약
- 검색·수정 제외: 생성물(dist/build), 벤더, 락파일 등

## 이슈별 1차 시작점
- <증상> → <먼저 볼 패키지/파일>

> 패키지 전용 상세는 각 `packages/<x>/AGENTS.md` 참조(가장 가까운 파일 우선).
```

### 5-2. 패키지 전용 `packages/<x>/AGENTS.md`
```markdown
# <패키지명>

## 이 패키지만의 규칙
- 빌드/테스트/실행: `<cmd>`
- 이 패키지 고유 컨벤션·주의점 (루트와 다른 것만)
- 주요 진입점 파일
```

### 5-3. 루트 `CLAUDE.md` (< 200줄)
```markdown
# CLAUDE.md

@AGENTS.md

## Claude 전용 안내
- 패키지/영역별 상세 규칙은 `.claude/rules/`에 있고, 해당 경로 파일을 다룰 때 자동 로드된다.
- 강제 규칙(포맷·보호경로)은 `.claude/settings.json`의 hooks/permissions로 관리한다.
- <Claude 특유 동작: 예) 위험 변경은 plan 모드로>
```

### 5-4. `.claude/rules/<domain>.md`
```markdown
---
paths: ["packages/<x>/**"]
---

# <영역> 작업 규칙

## 불변식 (이 영역에서 어기면 안 되는 것)
1. ...

## DO / DON'T
| 금지 | 이유 |
|---|---|
| ... | ... |
```

### 5-5. `CLAUDE.local.md` (gitignore)
개인 취향·실험 지침. `.gitignore`에 등재. 워크트리 간 공유가 필요하면 `@~/.claude/<개인지침>.md` import.

---

## 6. 작성 황금률

1. **짧게 — 항상-로드 파일당 200줄 목표.** 줄마다 자문: *"이 줄을 지우면 에이전트가 실수하나?"* 아니면 삭제. 길면 중요한 규칙이 묻혀 **무시된다.**
2. **구체적·명령형·검증 가능하게.** "코드 잘 정리"(❌) → "API 핸들러는 `packages/api/src/handlers/`에"(✅). "테스트해라"(❌) → "커밋 전 `<test cmd>` 실행"(✅).
3. **마크다운 구조를 쓴다.** 헤더+불릿. 에이전트는 사람처럼 구조를 스캔한다.
4. **`@import`는 토큰을 아끼지 않는다.** 조직화용. 절감은 지연 로딩(rules/skills)으로.
5. **강제는 산문 대신 hook/permissions.** 항상-로드 파일은 조언(시스템 프롬프트 뒤 user 메시지)이지 강제 설정이 아니다.
6. **검증 수단을 알려준다.** 테스트 러너·빌드·린트를 명시해 에이전트가 "looks done"에서 멈추지 않게.
7. **모순 금지.** 여러 파일이 충돌하면 임의로 하나를 고른다 → 주기적 정합성 점검.

---

## 7. (선택) 장문 지식 & 아키텍처 결정 — `docs/`

프로젝트가 커져 배경·결정 기록이 쌓일 때만 연다. **md 관리의 확장이지 필수는 아니다.**
- 진입점 `docs/README.md`("무엇이 어디 있나") + 필요 시 `docs/decisions/`(ADR).
- **ADR 규율**: append-only. 수락된 결정은 **수정 금지**, 번복은 새 ADR + 기존에 `Superseded by NNNN` 표시.
  상태 필드(`Proposed`/`Accepted`+날짜/`Superseded`)로 "지금 유효한 결정"을 스캔 가능하게.
- rules의 작업 순서 1번을 "시작 시 `docs/README.md`부터 읽는다"로 두면 just-in-time 진입점이 된다.

---

## 8. 유지보수 루틴 (파일을 "코드처럼")

- **추가**: 에이전트가 같은 실수를 반복 / 리뷰가 알았어야 할 걸 잡음 / 같은 교정을 반복 입력할 때.
- **가지치기**: 주기적으로 항상-로드 파일과 `.claude/rules/`를 훑어 낡거나 충돌하는 지침 제거. 이미 잘 하면 그 지침은 삭제(또는 hook 전환).
- **검증**: 지침 추가 후 행동이 실제로 바뀌는지 관찰. 안 바뀌면 죽은 지침.

---

## 9. 안티패턴 체크리스트

- [ ] 항상-로드 파일이 200줄 초과로 중요한 규칙이 묻힘 → 가지치기 / rules·skills로 분리
- [ ] 다단계 절차를 산문으로 → Skill로
- [ ] "매번/절대" 규칙을 항상-로드 파일에(강제 안 됨) → hook / permissions.deny
- [ ] `@import`로 쪼개면 토큰이 준다고 믿음 → 아님(전부 로드). 지연 로딩만 절감
- [ ] AGENTS.md를 두고 Claude가 자동으로 읽을 거라 기대 → `@AGENTS.md` import로 명시
- [ ] 도구별로 CLAUDE.md·AGENTS.md·.cursorrules 각각 손편집 → 한 소스(AGENTS.md) + import
- [ ] 라이브 외부 데이터 붙여넣기 → MCP 서버 연결
- [ ] 코드만 봐도 아는 것·표준 언어 관례·긴 API 문서를 항상-로드 파일에 → 삭제/링크
- [ ] 개인 취향을 공유 파일에 → CLAUDE.local.md / `~/.claude/`
- [ ] Explore·Plan 서브에이전트가 CLAUDE.md를 볼 거라 가정 → 이 둘은 건너뛴다. 위임 프롬프트에 필수 규칙 재명시

---

## 10. 새 프로젝트 셋업 순서

1. [ ] 루트 `AGENTS.md` 작성 — 요약·워크스페이스맵·빌드/테스트·공통 컨벤션·이슈별 시작점 (§5-1)
2. [ ] 루트 `CLAUDE.md` = `@AGENTS.md` + Claude 전용 포인터 (§5-3)
3. [ ] 패키지가 갈리면 `packages/<x>/AGENTS.md`(크로스툴) + `.claude/rules/<domain>.md`(Claude, paths) (§3, §5-2/5-4)
4. [ ] 강제 규칙은 `.claude/settings.json`의 hooks/permissions (보호경로 deny, edit 후 포맷 등)
5. [ ] 반복 절차는 `.claude/skills/`, 외부 시스템은 `.mcp.json`
6. [ ] `CLAUDE.local.md`를 `.gitignore`에 등재
7. [ ] 배경·결정이 쌓이면 그때 `docs/`(+ADR) 개설 (§7)

> **규모별**: 소형 = `AGENTS.md`(+`CLAUDE.md` 한 줄 import)만. 패키지/도메인이 갈리기 시작하면 3번을 도입.
> 나머지(4~7)는 실제로 필요해질 때. **과설계 금지** — 처음부터 전부 만들지 않는다.

---

## 출처

- Claude Code 공식: [Memory](https://code.claude.com/docs/en/memory) · [Best practices](https://code.claude.com/docs/en/best-practices) · [Skills](https://code.claude.com/docs/en/skills) · [Sub-agents](https://code.claude.com/docs/en/sub-agents) · [Hooks](https://code.claude.com/docs/en/hooks-guide) · [Permissions](https://code.claude.com/docs/en/permissions) · [Output styles](https://code.claude.com/docs/en/output-styles) · [MCP](https://code.claude.com/docs/en/mcp)
- Anthropic: [Steering Claude Code](https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more) · [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- 크로스툴: [AGENTS.md 표준](https://agents.md/) · [Agentic AI Foundation (Linux Foundation)](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
- 타 도구: [Cursor Rules](https://cursor.com/docs/context/rules) · [GitHub Copilot 지침](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot) · [Cline Rules](https://docs.cline.bot/customization/cline-rules)/[Memory Bank](https://docs.cline.bot/features/memory-bank) · [Kiro Steering](https://kiro.dev/docs/steering/)

<!-- 도구 중립 가이드. 새 프로젝트 루트나 docs/에 복사해 사용. 에이전트에게 "이 가이드대로 세팅해줘"로 적용. -->
