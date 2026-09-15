---
last-verified: "2026-08-12"
---

# Test Strategy

> 이 프로젝트의 테스트는 기능 뒤에 붙이는 작업이 아니라 개발 구조 안에 같이 들어가는 품질 레이어다.
> 기준 기술 스택: React + Vite, FastAPI, Supabase, Capacitor, AdMob
> 단, MVP 단계에서는 과한 자동화보다 핵심 리스크를 막는 최소 세트를 우선한다.

---

## 목표

- 기능 추가와 동시에 회귀 방지 장치를 만든다
- AI 출력 품질과 일반 로직 테스트를 분리한다
- 웹 테스트와 모바일 실기기 테스트를 분리한다
- 출시 전 품질 게이트를 문서화한다

---

## 테스트 레이어

### 1. Unit

대상:
- `backend/services/rag_service.py` (build_*_context, FACE_TYPE_MAP)
- 이미지 유효성 검사 (`src/utils/validateImage.js`)
- 카드 잠금/해제 규칙
- 퍼스널컬러 분기
- 키워드 매핑
- 메이크업 추천 제품 키워드/쿠팡 링크 매핑 규칙

도구:
- 프론트: `Vitest`
- 백엔드: `pytest`

원칙:
- 순수 함수는 반드시 unit test를 가진다
- 버그 수정 시 회귀 테스트를 같이 추가한다

### 2. Contract

대상:
- `/api/analyze`
- `/api/cards/*`
- `/api/photo/generate`
- `/api/history`, `/api/history/{analysisId}`
- 공통 에러 응답 포맷
- 메이크업 카드 `recommendedProducts` 응답 shape

도구:
- `pytest + fastapi.testclient`

원칙:
- 프론트는 응답 shape에 의존하므로 API 스키마 변경은 contract test 없이 머지하지 않는다

### 3. Integration

대상:
- Auth
- Supabase 저장/조회
- RLS
- Rate limiting
- 로그인 상태별 사용량 제한 반영
- 로그인 분석 저장: `/api/analyze` → `analyses`
- 로그인 카드 저장: `/api/cards/*` → `cards`
- 생성 사진 캐시: `(analysisId, cardType)` → cached 응답

도구:
- `pytest`
- Supabase SQL 테스트 또는 클라이언트 기반 테스트

원칙:
- 게스트 / 로그인 2가지 권한 상태를 fixture로 고정한다
- 외부 Supabase/Gemini 호출은 mock 하고, 라우트 wiring과 payload를 우선 검증한다

현재 커버리지:
- `backend/test_integration.py`: Phase 2 API schema + Gemini 응답 contract
- `backend/test_phase3.py`: Phase 3 auth/history/storage route wiring
- `backend/test_consistency.py`: 얼굴형↔features↔무드 정합성 (ADR 0009) — Gemini 호출 0
- `tools/test_score_features.py`: features 축 채점기 회귀 (화이트리스트 파싱·안정성·Phase B 라벨) — `backend/.venv/Scripts/python.exe -m pytest tools/test_score_features.py`
- `test/backendAuth.test.js`: 프론트 API 클라이언트 Authorization/history payload
- `test/App.flow.test.jsx`: splash/onboarding/login/home 진입 회귀
- `test/Home.test.jsx`: 게스트 recent fetch 차단, 로그인 recent fetch + 상세 진입
- `test/History.test.jsx`: 히스토리 로딩/만료/에러 UI + 상세 진입 + 새 분석 CTA
- `test/HistoryDetail.test.jsx`: 저장된 카드 재오픈 시 `analysisId` 복원
- `test/authBridge.test.js`: post-login return target 저장/1회 소비 + guest 전환 시 target 정리
- `test/AnalysisResult.test.jsx`: 헤어=1차/메이크업=2차 CTA wiring + analysisId 유무에 따른 SAVED 배지 (Phase 4-4) + features 0~3개 렌더 (ADR 0009)
- `test/CardDetail.test.jsx`: 합성 전/후 sticky CTA 조건 분기 (합성 보기↔결과 공유/다시 보기) (Phase 4-5)
- `test/MakeupDetail.test.jsx`: 사진 생성 CTA 미노출(규칙 6) + 제품 블록 쿠팡 링크/검색 키워드 분기 (Phase 4-5)
- `test/Trend.test.jsx`: 준비중 경량화 — mock 피드/search 버튼 제거 + START ANALYSIS→home (Phase 4-6)
- `test/My.test.jsx`: mock 축소 — fake stats/유저 퍼스널컬러/dead 메뉴·settings 제거 + 세션 JWT email/provider 실데이터 표시 (Phase 4-7)
- `test/ShareCard.test.jsx`: 합성 사진 유무에 따른 before/after 비교형 ↔ 결과 카드형 + 저장 1차/공유 2차 CTA (Phase 4-8)
- `test/StateNotice.test.jsx`: 공통 empty/error/loading 블록 — variant별 eyebrow 색(loading 회색/error 경고색) + 본문 노드 렌더 (Phase 4 문구 통일)

아직 비는 구간:
- guest gate reason 분기와 OAuth 복귀를 엮는 상위 흐름 테스트
- Playwright E2E (`업로드 → 분석 → 카드`, `로그인 → 히스토리 → 상세`)

### 3.5 dev/mock 수동 UI 점검 (브라우저)

백엔드/실제 OAuth 없이 전체 화면 흐름을 손으로 점검할 때 쓴다. `VITE_MOCK=true` 일 때만 노출되는 dev 전용 진입점이며, 운영 빌드에는 렌더/번들되지 않는다.

- 실행: `.env.mocktest.local`(gitignore됨, `VITE_MOCK=true`) + `npx vite --mode mocktest --port 5175`
- **테스트 로그인**: `Login` 화면의 `🧪 테스트 로그인 (mock)` → `auth.signInAsTestUser()` 가 가짜 Supabase JWT 세션(`test@beaumi.app`, provider `google`) 활성화. 로그인 전용 화면(My/History/TRY ON) 점검용.
- **샘플 얼굴**: `PhotoUpload` 의 `🧪 샘플 얼굴 사용 (mock)` → 번들 샘플(`src/assets/dev-sample-face.jpg`, 골든셋 얼굴 1장)을 업로드한 것처럼 세팅 + 동의 자동 체크. 파일 picker 없이 분석 플로우 진입용. `VITE_MOCK` 게이트라 운영 빌드에는 포함되지 않는다.
  - ⚠️ 이 이미지는 **실제 인물 사진**(골든셋 중 1장)이다. 스크린샷·공유 이미지·문서에 결과를 남길 때 인물명을 쓰지 않는다. 경계는 `tools/README.md` 의 "골든셋 사진의 성격" 참조.
- 점검 경로: 로그인 → 업로드(샘플) → 퍼스널컬러 → 분석 결과(CTA 위계) → 카드 → 상세(합성 전/후 CTA) → 공유(before/after).

### 4. E2E Web

대상:
- 업로드 → 분석 → 결과 → 카드
- 로그인 → 히스토리 저장/조회
- 광고 기반 잠금 해제 핵심 흐름
- 메이크업 카드 상세 → 추천 제품 블록 → 쿠팡 링크 진입

도구:
- `Playwright`

원칙:
- 모든 화면을 E2E로 덮지 않는다
- 사용자 가치가 큰 핵심 경로만 유지한다
- MVP 기준으로는 2개 안팎의 핵심 시나리오면 충분하다

### 5. AI Eval

대상:
- 얼굴형 판정
- feature 추출
- 카드 품질
- 금지 출력 및 충돌 여부
- 메이크업 카드에서 임의 상품명/임의 제휴 링크 생성 여부

도구:
- `/eval-face` 스킬 — Claude 정액제로 골든셋 회귀 (Gemini 비용 0)
- `tools/eval.py` — Gemini 호출판 (운영 정확도)
- `tools/score_features.py` — features 축 채점기. 위 둘이 **같은 것을 공유한다**
- 골든셋 / 평가셋 — `tools/golden-set.json`

채점하는 축은 둘이고 성격이 다르다:

| 축 | 지표 | ground truth |
|---|---|---|
| 얼굴형 | 정확/인접/빗나감/판정어려움 + 회차 일관성 | 골든셋 폴더명 (자가평가) |
| features | 수율·커버리지·안정성·어휘·정합성 | **없다** — 라벨 없이 재는 지표만 쓴다 |

원칙:
- exact match보다 납득률, 충돌 여부, 금지 출력 여부를 본다
- 프롬프트/RAG 수정 시 eval 재실행이 기본이다
- 초기 골든셋은 10~15장으로 시작하고, 출시 후 점진적으로 늘린다
- **features 에 라벨이 없다는 것을 정확도로 위조하지 않는다.** 정확도(Phase B)는 골든셋 item 에
  `expectedFeatures`/`forbiddenFeatures` 를 붙인 사진만 계산하고 나머지는 무채점이다.
- 같은 사진 N회 반복의 라벨 불일치(안정성)를 가장 강한 신호로 본다 — 회차마다 "눈 간격 넓음/좁음" 이
  갈리면 정확도를 논할 필요 없이 판단 기준이 모호한 것이다.
- 모델 raw 응답의 정합성 위반은 `/eval-face` 가 재고, 사후 필터가 그것을 걷어내는지는
  `backend/test_consistency.py` 가 결정론적으로 검증한다 (역할이 다르므로 둘 다 필요하다).

### 6. Device Smoke

대상:
- 카메라
- OAuth 복귀
- 공유
- AdMob 보상형 광고
- 사진 생성 일일 제한 반영
- 실기기 네트워크/CORS
- 쿠팡 외부 링크 이동

도구:
- Android 실기기
- iOS 실기기 또는 TestFlight 전 체크

원칙:
- Capacitor 브리지는 웹 E2E로 대체하지 않는다
- release candidate마다 smoke test를 다시 돈다
- Android MVP 단계에서는 Android smoke를 우선하고 iOS는 문서화만 선행한다

---

## 권장 폴더 구조

```txt
tests/
  unit/
  contracts/
  integration/
  e2e-web/
  evals/
  fixtures/
  golden/
  device-smoke/
```

---

## 권장 도구 스택

| 레이어 | 도구 |
|------|------|
| 프론트 unit | `Vitest` |
| 백엔드 contract/integration | `pytest`, `fastapi.testclient` |
| 웹 E2E | `Playwright` |
| DB/RLS | Supabase SQL 테스트 또는 클라이언트 테스트 |
| AI eval | `/eval-face` 스킬 · `tools/eval.py` + `tools/score_features.py` + 골든셋 |
| 디바이스 QA | 실기기 smoke checklist |

---

## 개발 중 운영 방식

### PR 전

- unit test 실행
- contract test 실행
- 수정 범위가 크면 integration test 실행

### main 병합 전

- 핵심 E2E 실행
- AI 관련 변경이면 eval 실행

### 배포 전

- staging smoke test 실행
- Render/Railway 환경에서 API 확인

### 앱 릴리즈 전

- Android 실기기 smoke test
- Play Console Pre-launch Report 확인
- 실제 스토어 sandbox 검증은 출시 직전 단계에서 진행

---

## 테스트 데이터를 어떻게 관리할지

### fixtures

- API 요청/응답 예시
- 로그인 상태별 샘플 토큰/유저
- 카드 샘플 데이터

### golden

- 얼굴형 평가 이미지셋
- 기대 얼굴형
- 기대 feature 메모
- 문제 사례와 회귀 이슈

원칙:
- 실사용자 원본 데이터는 익명화 없이 테스트셋에 넣지 않는다

---

## 이 프로젝트에서 특히 중요한 규칙

1. AI 테스트와 일반 단정 테스트를 섞지 않는다.
2. 로직은 unit/contract로, 품질은 eval로 본다.
3. Capacitor 기능은 반드시 실기기로 확인한다.
4. 새 기능은 테스트 추가 없이는 완료로 보지 않는다.
5. 버그를 고치면 같은 종류의 회귀 테스트를 남긴다.
6. 메이크업 카드에서는 사진 생성 CTA가 다시 노출되지 않도록 회귀 테스트를 둔다.

---

## MVP에서 줄여도 되는 부분

- visual regression / screenshot golden은 초기에 필수 아님
- OAuth 전체 자동화는 수동 smoke + 권한 로직 테스트로 대체 가능
- 대규모 AI eval 셋은 나중에 확장
- iOS smoke는 Android 출시 후 강화
- 모든 화면 E2E는 금지, 핵심 경로만 유지

---

## 출시 전 최소 품질 게이트

### 저장소/자동화 기준

- [x] 프론트 핵심 로직 unit test 구축
- [x] 백엔드 핵심 API contract test 구축
- [x] 인증/권한 integration test 구축
- [x] 정적 분석(lint) 게이트 동작 — `npm run lint` (ESLint 9 flat config, 루트 `eslint.config.js`)
- [x] 문서 검증 게이트 동작 — `npm run docs:check` (`scripts/docs-check.mjs`)
- [x] 저장 시점 강제 검사 — `.claude/hooks/check-file.mjs` (인코딩·퍼블리시티권 금지어)
- [ ] 업로드 → 분석 → 카드, 로그인 → 히스토리 중 핵심 E2E 1~2개 구축
- [ ] 메이크업 카드 추천 제품/쿠팡 링크 핵심 흐름 테스트 구축
- [ ] 얼굴형/카드 eval 데이터셋 10~15장 구축

### 사용자 직접 확인 기준

- [ ] Android device smoke checklist 통과

---

## 요약

- 일반 로직은 `unit + contract + integration`
- 사용자 흐름은 `Playwright E2E`
- AI 품질은 `eval`
- Capacitor 연동은 `device smoke`

이 4개를 분리해서 굴리는 것이 이 프로젝트의 기본 원칙이다.

## 로컬 검증 명령

```bash
npm run verify
```

`lint` → `test` → `docs:check` 를 순서대로 돌린다. 개별로도 실행할 수 있다.

`lint` 는 `src/`·`test/` 와 `.claude/hooks/` 만 본다. `backend/`·`tools/` (Python) 과
`src/handoff/` (디자인 스냅샷 사본) 은 제외 대상이다.

### `docs:check` 가 보는 것 (`scripts/docs-check.mjs`)

**결합이 아니라 주장을 검증한다.** "코드와 문서를 같이 고쳤나"는 파일을 건드리기만 해도 통과하는
약한 지표라, 문서가 *사실인지* 를 직접 본다.

| 검사 | 잡는 실패 |
|------|----------|
| `.claude/rules/` frontmatter + `paths` 글롭 | YAML 이 깨지거나 글롭이 아무것도 안 잡아 **규칙이 조용히 로드되지 않는 경우** |
| ADR frontmatter 규율 | 번호 중복, 파일명 불일치, `status`/`superseded_by` 모순 |
| 마크다운 상대 링크 | 파일 이동·개명 후 방치된 죽은 링크 |
| 백틱 경로 참조 | 실존하지 않거나 base 가 모호한 경로 |
| `api-contract.md` 주장 필드 | **백엔드에 없는 유령 필드를 계약처럼 서술** |
| `last-verified` 경과일 | 아무도 안 건드려 시간이 지나며 낡아가는 문서 (기준 45일) |

마지막 항목이 핵심이다. 결합 검사가 원리적으로 못 잡는 유일한 종류다 — 문서는 같이 고쳐서
낡는 게 아니라, **아무도 안 봐서** 낡는다.

계획 단계라 아직 구현되지 않은 필드는 해당 절 제목에 `미구현` 을 넣어 검사에서 제외한다.

퍼블리시티권 금지어를 **정당하게** 담아야 하는 파일은 `check-file:allow-policy-terms` 마커로
면제한다. 현재 면제 파일은 아래 7개이며, 새로 붙일 때는 같은 줄에 이유를 적는다.

```
backend/services/gemini_service.py    금지 지시 프롬프트
backend/services/rag_service.py       금지 지시 프롬프트 (ANALYZE_PROMPT)
backend/test_integration.py           가드 테스트
test/backendIntegration.test.js       가드 테스트
test/liveBackend.test.js              가드 테스트
src/handoff/README.md                 금지 항목 나열 목록
src/handoff/CLAUDE_CODE_NOTES.md      제거된 옛 필드 기록 (정책 변경 증빙)
```

목록을 다시 셀 때는 `.md` 를 빼먹지 않는다 — `src/` 아래 마크다운도 검사 대상이다.
전수 확인:

```bash
grep -rn "celebrityMatch\|look-alike\|닮은꼴" --include="*.js" --include="*.jsx" --include="*.md" --include="*.py" src/ backend/ test/ tools/
```
