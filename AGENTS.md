---
last-verified: "2026-09-15"
---

# AGENTS.md

> 이 프로젝트의 단일 진실 소스는 **`CLAUDE.md`** 입니다.
> 모든 에이전트(Claude Code, Codex 등)는 `CLAUDE.md`를 우선 읽으세요.
> 본 파일은 호환성을 위한 포인터일 뿐, 내용을 직접 갱신하지 않습니다.

## 빠른 안내

- 프로젝트 개요·기술 스택·실행 명령·전역 불변식: [`CLAUDE.md`](./CLAUDE.md)
- 문서 지도 (무엇이 어디 있나): [`docs/README.md`](./docs/README.md)
- UI 흐름과 컴포넌트 동작: [`docs/ui-flow.md`](./docs/ui-flow.md)
- 테스트 전략과 품질 게이트: [`docs/test.md`](./docs/test.md)
- 프론트↔백엔드 연결 현황: [`docs/connection-status.md`](./docs/connection-status.md)
- RAG 데이터 사용 가이드: [`backend/data/rag_usage_guide.md`](./backend/data/rag_usage_guide.md)
- 로드맵·큰 그림: [`docs/ROADMAP.md`](./docs/ROADMAP.md)
- **실행 계획과 체크리스트**: [`docs/plans/README.md`](./docs/plans/README.md)
- 아키텍처 결정 기록 (ADR, append-only): [`docs/decisions/README.md`](./docs/decisions/README.md)
- Supabase/Google Auth 설정 메모: [`docs/auth-setup.md`](./docs/auth-setup.md)

## Claude Code 전용 컨텍스트

Claude Code 는 아래를 추가로 자동 로드합니다. 다른 도구를 쓴다면 **직접 열어서 읽어야 합니다.**

- `.claude/rules/frontend.md` — Beaumi 디자인 시스템, 컴포넌트 지도 (`src/**`, `test/**`)
- `.claude/rules/backend.md` — RAG 데이터 구조, 키 매핑, 프롬프트 규칙 (`backend/**`, `tools/**`)
- `.claude/rules/api-contract.md` — 분석/카드 응답 스키마, 데이터 흐름

## 필수 규칙 — 검사는 Claude Code 밖에서 자동으로 돌지 않습니다

<!-- check-file:allow-encoding-sample — 아래 본문이 깨진 글자를 예시로 인용하므로 hook 의 글자 검사를 면제한다. -->

아래 셋은 **규칙 자체는 에이전트 종류와 무관하게 적용**되지만, **자동 차단은 Claude Code 안에서만**
동작합니다. `.claude/hooks/` 는 Claude Code 의 도구 이벤트에 붙어 있어, Codex 로 파일을 저장하면
아무것도 검사하지 않습니다.

- **인코딩** — BOM / CRLF / 깨진 글자(mojibake). UTF-8(BOM 없음) + LF 만 허용.
  - 이 저장소는 한글과 `·`(U+00B7) 를 코드·테스트에 직접 씁니다. CP949 로 저장되면 `·` 가 `쨌` 로
    바뀌어 **테스트는 통과하는데 UI 만 깨지는** 사고가 납니다 (2026-05 실제 발생).
- **퍼블리시티권** — 연예인 비교·닮은꼴 관련 식별자. 무드 아키타입 8개 키워드로 대체.
  - 판례 리스크입니다. 적용 범위는 API 응답·UI·로그·공유 이미지·프롬프트 전부입니다.
- **문서 동기화** — 코드를 바꿨는데 대응 문서가 그대로면 안 됩니다.

### Claude Code 가 아닌 도구로 작업할 때

**작업을 마치기 전에 반드시 아래를 직접 실행하세요.** hook 이 자동으로 잡아주지 않습니다.

```bash
npm run verify
```

`lint` → `test` → `check:files`(인코딩·금지어) → `docs:check`(죽은 링크·유령 필드·문서 경과일)
순으로 돕니다. 변경 파일만 빠르게 보려면 `npm run check:files` 만 따로 돌려도 됩니다.

백엔드를 건드렸다면 파이썬 테스트도 함께 돌립니다.

```bash
cd backend && .venv/Scripts/python.exe -m pytest -q
```

### 쓸 수 없는 것

`.claude/skills/` 의 `/eval-face`, `/docs-audit` 는 Claude Code 전용입니다. 다른 도구에서는
호출할 수 없으니, 프롬프트를 수정했다면 **골든셋 회귀는 Claude Code 세션에서 따로 돌리세요**
(`backend/services/rag_service.py` 의 `ANALYZE_PROMPT` 를 바꾸면 필수입니다).

## 문서 업데이트 규칙

기능이 변경되면 대응 문서를 같은 작업에서 갱신합니다.
갱신 대상 표는 [`CLAUDE.md` 의 "문서 업데이트 규칙"](./CLAUDE.md) 섹션에 있습니다.

### 작업을 끝냈으면 plan 체크를 갱신하세요

할 일과 완료 여부는 [`docs/plans/`](./docs/plans/README.md) 가 단일 출처입니다.
번호가 붙은 실행 계획(`NNNN-*.md`)에 상세 체크리스트가 있습니다.

- 끝난 항목은 `- [x]` 로 체크합니다. **코드로 확인한 것만** 체크하세요.
- 접은 항목은 지우지 말고 `- [ ] ~~내용~~ — 취소: 이유` 로 남깁니다. 취소는 진행률 분모에서 빠집니다.
- 남은 항목이 0개가 되면 frontmatter 의 `status` 를 `Done` 으로 바꿉니다.

```bash
npm run plans:progress    # 진행률 + 규율 검사
```

`status` 와 체크 상태가 어긋나면 `npm run docs:check` 가 막습니다.

> ⚠️ **`docs/decisions/` 의 ADR 본문에도 체크박스가 남아 있지만 작성 당시 스냅샷입니다.**
> ADR 은 append-only 라 갱신하지 않습니다. 두 곳이 어긋나면 `docs/plans/` 가 맞습니다.
