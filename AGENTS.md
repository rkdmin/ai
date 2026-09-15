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

## 강제 규칙 (에이전트 종류와 무관하게 적용)

`.claude/hooks/` 가 도구 계층에서 다음을 차단합니다. 산문 규칙이 아니라 실제로 막힙니다.

- **인코딩** — BOM / CRLF / 깨진 글자(mojibake). UTF-8(BOM 없음) + LF 만 허용.
- **퍼블리시티권** — 연예인 비교·닮은꼴 관련 식별자. 무드 아키타입 8개 키워드로 대체.
- **문서 동기화** — 코드를 바꿨는데 대응 문서가 그대로면 작업 종료 시점에 알립니다.

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
