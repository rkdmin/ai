# docs — 무엇이 어디 있나

문서는 **성격에 따라 세 종류**로 나뉜다. 찾는 것이 "지금 어떻게 동작하나"인지,
"왜 이렇게 정했나"인지, "어떻게 설정하나"인지를 먼저 구분하면 빠르다.

## 1. 지금 유효한 상태 (수시 갱신)

코드와 어긋나면 **문서가 틀린 것**이다. 기능을 바꾸면 같은 작업에서 함께 고친다.

이 칸의 문서는 `last-verified` frontmatter 를 갖는다. 코드와 대조해 확인했으면 그날 날짜로
갱신한다. 45일이 지나면 `npm run docs:check` 가 경고한다.

| 문서 | 내용 | 갱신 시점 |
|------|------|----------|
| [`ui-flow.md`](./ui-flow.md) | 화면 흐름과 컴포넌트 동작·조건·state | step 추가/삭제, 컴포넌트 동작 변경 시 |
| [`test.md`](./test.md) | 테스트 구조와 품질 게이트 | 테스트 구조·게이트 변경 시 |
| [`connection-status.md`](./connection-status.md) | 프론트↔백엔드 연결 현황 (미연결 항목 포함) | 엔드포인트 wiring 변경 시 |
| [`ROADMAP.md`](./ROADMAP.md) | 전체 단계와 진행 현황 라이브 뷰 | Phase 진행 상태 변경 시 |
| [`PHOTO_GUIDE.md`](./PHOTO_GUIDE.md) | 촬영 가이드 기준 | 업로드 요구사항 변경 시 |
| [`auth-setup.md`](./auth-setup.md) | Supabase / Google OAuth 콘솔 설정 절차 | 콘솔 설정·인증 흐름 변경 시 |

`backend/data/rag_usage_guide.md` (RAG 병합 규칙의 단일 진실 소스)도 같은 규율을 따른다.

점검은 `/docs-audit` 스킬로 한다 — `npm run docs:check` 를 통과시킨 뒤, 스크립트가 못 잡는
산문 주장("~는 mock 이다")을 코드와 직접 대조하는 절차다.

## 2. 왜 이렇게 정했나 (append-only)

[`decisions/`](./decisions/README.md) — 번호가 붙은 아키텍처 결정 기록(ADR).
과거 `phase1~7.md` 가 여기로 이관됐다. **수락된 결정은 고치지 않고, 번복은 새 ADR 로 남긴다.**

배경이 궁금할 때만 열면 된다. 매 작업에서 읽을 필요는 없다.

## 3. 무엇을 어떤 순서로 할 것인가 (실행 계획)

[`plans/`](./plans/README.md) — 번호가 붙은 실행 계획. **상세 체크리스트가 여기 있다.**

살아 있는 문서다. 항목이 끝나면 체크하고, 접었으면 취소선을 긋는다. 진행률은
`npm run plans:progress` 로 집계한다. ADR 본문의 체크박스는 작성 당시 스냅샷이므로
**실행 추적의 단일 출처는 여기다.**

| 성격 | 예 |
|------|-----|
| Phase 실행 계획 | [0002 Phase 1](./plans/0002-phase1-face-accuracy-rag.md) ~ [0008 Phase 7](./plans/0008-phase7-ios.md) |
| Phase 교차 | [0001 v1.0 출시 기준](./plans/0001-v10-release-criteria.md) |
| 검토 전 제안 | [0009 와이어프레임 구현 계획](./plans/0009-wireframe-review.md) (`status: Proposed`) |

## 4. 방법론

| 문서 | 내용 |
|------|------|
| [`ai-context-playbook.md`](./ai-context-playbook.md) | AI 에이전트용 md 컨텍스트 관리 방법론 (도구 중립) |

## 이 저장소의 문서가 아닌 것

| 위치 | 내용 |
|------|------|
| [`../CLAUDE.md`](../CLAUDE.md) | 항상 로드되는 프로젝트 지침 (짧게 유지) |
| `../.claude/rules/` | 경로 스코프 규칙 — 해당 영역 파일을 다룰 때만 로드 |
| [`../backend/data/rag_usage_guide.md`](../backend/data/rag_usage_guide.md) | RAG 데이터 구조·병합 규칙 (단일 진실 소스) |
| [`../src/handoff/`](../src/handoff/) | 디자인 handoff 패키지 + 정책 변경 노트 |
