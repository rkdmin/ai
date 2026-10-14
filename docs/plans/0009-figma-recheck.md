---
attachment-of: "0009"
title: "Figma 재확인 — 결정 Q1~Q7"
last-verified: "2026-10-12"
---

# Figma 재확인 — 결정 Q1~Q7

<!-- check-file:allow-policy-terms — Figma 내 퍼블리시티권 금지 표현의 발견 여부를 기록하는 감사 문서 -->

> **지난 closeout 과 달라진 결론: 2개** — (1) 긴 무료 결과 [`158:657`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=158-657)에서 결제 [`108:3056`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3056)로 가는 빨간 연결선은 없다. 기존 closeout의 `연결선` 판정을 철회한다. (2) 친구 없음 [`106:2296`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=106-2296)의 `친구 초대하기`에서 공유 시트 [`108:2984`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2984)로 가는 빨간 선·IA 문장은 없다. 기존 closeout의 `IA` 판정을 철회한다.

## 재확인 범위와 방법

| 확인 항목 | 이번에 본 범위·방법 | 결과 | 근거 노드 |
|---|---|---|---|
| 파일·캔버스 | 파일 `PCUCRGz6FRNmOrhynuHulp`의 맨 오른쪽 최신 캔버스만 조회. 다른 캔버스는 조회 대상에서 제외 | 대상 일치 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| 스크린샷 | 캔버스와 CORE / STYLE·MY / CHEMISTRY / STATES를 각각 `contentsOnly: false`, `maxDimension: 8192`로 촬영하고 빨간 선을 확대 확인 | 5장 확인 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562), [`120:574`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-574), [`143:2170`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2170), [`143:2171`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2171), [`143:2172`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2172) |
| 구조 메타데이터 | 같은 5개 노드에 `get_metadata` 실행. 캔버스 응답에서 `CONNECTOR / LINE / VECTOR`를 전부 추출 | `CONNECTOR 0`, `LINE 84`, `VECTOR 19`; 전체 ID는 부록 A | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| 화면 밖 메모 | 같은 5개 노드에 `get_design_context` 실행. 캔버스 전체 응답과 네 구역 응답에서 화면 프레임 밖 텍스트를 분리하고 Q1~Q7 키워드를 원문 대조 | Q 관련 문구는 아래에 노드별 원문 인용 | [`122:628`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-628), [`143:2173`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2173), [`108:4085`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4085) |
| prototype reaction | 기준 인벤토리의 화면 프레임 53개 각각과 모든 자손의 `reactions`를 다시 조회 | 53개 모두 0, 합계 0; 누락 프레임 0. 부록 B 참조 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |

### 스크린샷 파일

| 범위 | 파일명 | 렌더 크기 | 원본 크기 | 노드 ID |
|---|---|---:|---:|---|
| 전체 캔버스 | [0009-figma-recheck-canvas-108-2562.png](./0009-figma-recheck-canvas-108-2562.png) | 7339×8192 | 13222×14759 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| CORE | [0009-figma-recheck-core-120-574.png](./0009-figma-recheck-core-120-574.png) | 8192×3607 | 10040×4420 | [`120:574`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-574) |
| STYLE·MY | [0009-figma-recheck-style-my-143-2170.png](./0009-figma-recheck-style-my-143-2170.png) | 8192×3264 | 12713×5065 | [`143:2170`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2170) |
| CHEMISTRY | [0009-figma-recheck-chemistry-143-2171.png](./0009-figma-recheck-chemistry-143-2171.png) | 8192×1929 | 9085×2139 | [`143:2171`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2171) |
| STATES | [0009-figma-recheck-states-143-2172.png](./0009-figma-recheck-states-143-2172.png) | 6281×1464 | 6281×1464 | [`143:2172`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2172) |

## Q1. 결제 전 로그인

**판정: 확인함·없음.** 메인 무료 결과 [`108:2862`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2862)에서 결제 [`108:3056`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3056)로는 직접 빨간 화살표가 있고, 그 사이에 계정 연결 [`112:1017`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1017)이 끼지 않는다. 긴 결과 [`158:657`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=158-657)는 결제까지의 선 자체가 없다. `112:1017`로 들어오거나 나가는 빨간 선도 없다.

| 확인 질문 | 판정 | 이번 근거 |
|---|---|---|
| `108:2862` → `108:3056` 직접선 | 확인함·있음 | 빨간 직선 [`122:599`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-599) + 화살촉 [`122:603`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-603), 라벨 [`122:601`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-601) 원문: `전체 Beauty Report 보기`. 출발 프레임 [`108:2862`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2862), 도착 프레임 [`108:3056`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3056). |
| `158:657` → `108:3056` 직접선 | 확인함·없음 | CORE와 전체 캔버스를 눈으로 확인하고, 캔버스 직속 빨간 도형의 좌표·끝점을 전수 대조했다. [`158:657`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=158-657)에 닿는 빨간 선·화살촉이 없다. |
| `112:1017`로 들어오는 선 | 확인함·없음 | STYLE·MY의 빨간 수동 벡터 [`143:2209`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2209)~[`143:2231`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2231)의 끝점을 화면 경계와 대조했다. [`112:1017`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1017)에 끝나는 선이 없다. |
| `112:1017`에서 나가는 선 | 확인함·없음 | 같은 STYLE·MY 스크린샷과 벡터 끝점 전수 대조. [`112:1017`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1017)에서 시작하는 선이 없다. |
| 결제 화면의 로그인 상태 전제 요소 | 확인함·없음 | [`108:3056`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3056)의 텍스트 21개를 전수 확인. 이메일·계정명·`로그인됨`은 없다. 있는 식별 입력은 [`108:3091`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3091) `휴대폰 번호`와 예시 값 [`108:3093`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3093)뿐이다. |

### Q1 키워드가 들어간 화면 밖 IA·설명 텍스트 원문

`계정 연결`이라는 정확한 문자열은 화면 밖 메모에는 0개다. 화면 안에는 제목 [`112:1018`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1018) `계정 연결`과 CTA [`149:612`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=149-612) `계정 연결하기`가 있다. 아래는 `결제 / 구매 / 로그인 / 게스트 / Guest` 중 하나 이상이 들어간 화면 밖 텍스트다.

| 노드 ID | 원문 | 비고 |
|---|---|---|
| [`120:576`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-576) | `신규 사용자의 핵심 분석 → 무료 결과 → 단일 Beauty Report 구매 흐름. 집중형 화면에는 Bottom Navigation 없음.` | 숨김 설명 |
| [`120:628`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-628) | `숨김: 분석 · 결과 · 결제 · 상세 · 초대 Web Flow` | 숨김 legacy IA 블록 |
| [`120:629`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-629) | `상품: Beauty Report 1회 구매 → Hair + Makeup 모두 Unlock` | 숨김 legacy IA 블록 |
| [`120:632`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-632) | `계정: Guest-first, 저장/복원/Room 영구화 시 연결` | 숨김 legacy IA 블록 |
| [`120:637`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-637) | `HOME · 분석 후 / 미구매` | 숨김 상태 라벨 |
| [`120:638`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-638) | `HOME · 분석 후 / 구매완료` | 숨김 상태 라벨 |
| [`122:575`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-575) | `신규 사용자의 핵심 분석 → 무료 결과 → 단일 Beauty Report 구매 흐름. 화면 간 화살표는 실제 진입 방향만 표시.` | CORE 설명 |
| [`122:604`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-604) | `결제 완료` | CORE 빨간 흐름 라벨 |
| [`122:631`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-631) | `• Bottom Nav 숨김: 분석 / 결과 / 결제 / 상세 / 초대 Web Flow` | FINAL IA RULES |
| [`122:632`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-632) | `• 상품: Beauty Report 1회 구매 → Hair + Makeup 모두 Unlock` | FINAL IA RULES |
| [`122:636`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-636) | `• 계정: Guest-first / 저장·복원·Room 영구화 시 연결` | FINAL IA RULES |
| [`143:2174`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2174) | `FLOW: 구매한 Beauty Report 진입` | MY 흐름 메모 |
| [`143:2177`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2177) | `"구매한 Beauty Report" Row Tap` | MY 흐름 메모 |
| [`126:657`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=126-657) | `Beauty Report 구매 완료` | HOME 상태 설명 |
| [`142:683`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=142-683) | `+ 구매한 Beauty Report` | MY 상태 설명 |
| [`122:641`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-641) | `HOME · 분석 후 / 미구매` | 상태 라벨 |
| [`122:642`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-642) | `HOME · 분석 후 / 구매 완료` | 상태 라벨 |
| [`122:654`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-654) | `STYLE은 유료결제 여부로 잠그지 않음 · 분석 전 = Mood/Trend Editorial · 분석 후 = FOR YOU 개인화` | STYLE 설명 |
| [`146:748`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=146-748) | `환불/취소 정책은 결제 플랫폼에 의존`<br>`(Refund policy / payment platform dependent)`<br><br>`• CTA 미포함 — 정책 확정 후 추가`<br>`• 인앱 결제 시 Apple/Google 정책 따름`<br>`• 고객센터 안내 텍스트로 대체` | 환불 정책 메모 |
| [`147:641`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-641) | `실제 App Store / Play Store 결제 정책에 따라`<br>`정확한 Restore 동작이 달라질 수 있음`<br><br>`• iOS: StoreKit restoreCompletedTransactions`<br>`• Android: Google Play BillingClient`<br>`• 복원 범위 및 조건은 결제 플랫폼 정책 따름`<br>`• UI 내부에 "결제 시스템에 따라 변경" 등`<br>`  기획 문구를 넣지 않음` | 복원 정책 메모 |
| [`143:2236`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2236) | `로그인 전 - 게스트` | 계정 상태 라벨 |
| [`143:2237`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2237) | `로그인 후 - 회원` | 계정 상태 라벨 |

스크린샷: `0009-figma-recheck-canvas-108-2562.png`, `0009-figma-recheck-core-120-574.png`, `0009-figma-recheck-style-my-143-2170.png`.

## Q2. 게스트가 살 수 있는가

**판정: 확인함·있음.** Guest-first 문장은 두 버전이 있고, 열거된 연결 시점은 `저장 / 복원 / Room 영구화`다. **구매는 이 목록에 없다.** 요청에서 지목한 `계정 연결을 안내`라는 정확한 문구는 없고, 실제 원문은 아래의 `…시 연결`이다. 다만 이것은 “게스트 구매 가능”을 명시한 문장이 아니므로, 구매 자격 정책 자체는 확인 필요다.

| 노드 ID | 정확한 원문 | 열거 시점 | `구매` 포함 여부 |
|---|---|---|---|
| [`120:632`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=120-632) | `계정: Guest-first, 저장/복원/Room 영구화 시 연결` | 저장, 복원, Room 영구화 | 없음 |
| [`122:636`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-636) | `• 계정: Guest-first / 저장·복원·Room 영구화 시 연결` | 저장, 복원, Room 영구화 | 없음 |

보조 근거로 계정 연결 화면은 [`112:1025`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1025) `분석은 로그인 없이도 사용할 수 있어요.`라고만 쓴다. 구매 가능 여부는 말하지 않는다.

스크린샷: `0009-figma-recheck-canvas-108-2562.png`, `0009-figma-recheck-style-my-143-2170.png`.

## Q3. 재분석과 리포트

**판정: 확인함·있음.** MVP 메모는 “사용자당 1개 통합 Beauty Report”를 명시한다. `재분석`이라는 단어는 캔버스 전체에 없고, UI CTA `새 사진으로 다시 분석하기 →`만 있다. CTA 근처 설명 텍스트는 없다.

| 확인 문자열·의미 | 판정 | 근거 원문 |
|---|---|---|
| `사용자당 리포트 1개` 정확한 문자열 | 확인함·없음 | 캔버스 전체 텍스트 검색 결과 0개. 대신 아래 인접 메모가 존재한다. 근거 컨테이너 [`143:2173`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2173). |
| MVP | 확인함·있음 | [`143:2189`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2189) `MVP 참고:` |
| 리포트 1개 의미 | 확인함·있음 | [`143:2190`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2190) `사용자당 1개 통합 Beauty Report 보유` |
| 후속 확장 | 확인함·있음 | [`143:2191`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2191) `→ 중간 목록 화면 불필요`; [`143:2192`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=143-2192) `향후 다수 Report 보관 시 Library 추가 가능` |
| `재분석` 정확한 문자열 | 확인함·없음 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) 전체 텍스트 검색 결과 0개 |
| `새 사진으로 다시 분석` | 확인함·있음 | [`126:629`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=126-629) `새 사진으로 다시 분석하기 →` |
| CTA 근처 설명 텍스트 | 확인함·없음 | CTA 컨테이너 [`126:628`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=126-628)의 텍스트 자손은 [`126:629`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=126-629) 하나뿐이다. |

따라서 새 사진 분석 시 기존 1개 리포트를 교체하는지, 버전을 남기는지, 구매 권한이 새 결과에도 유지되는지는 Figma에서 확인할 수 없다.

스크린샷: `0009-figma-recheck-style-my-143-2170.png`.

## Q4. 가격

**판정: 확인함·있음.** 가격 블록에 `TBD`가 실제로 있으나 할인에만 붙어 있다. 가격이 예시인지 확정인지 말하는 가격 전용 IA 메모는 없다.

| 노드 ID | 원문 | `TBD / 예시 / 임시 / 확정` 판정 |
|---|---|---|
| [`108:3076`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3076) | `₩29,000` | 네 단어 모두 없음 |
| [`108:3078`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3078) | `[할인 TBD]` | `TBD` 있음 |
| [`108:3079`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3079) | `₩9,900` | 네 단어 모두 없음 |
| [`108:3107`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3107) | `₩9,900 결제하기` | 네 단어 모두 없음 |
| [`122:632`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-632) | `• 상품: Beauty Report 1회 구매 → Hair + Makeup 모두 Unlock` | 가격 확정 여부 없음 |

`확정`은 환불 정책 [`146:748`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=146-748)과 개인정보 정책 [`148:674`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=148-674)에만 나오며 가격을 가리키지 않는다. `예시`는 다른 화면 콘텐츠에만 있고 가격과 연결되지 않는다. `임시`는 캔버스 전체에서 0개다. 따라서 **가격은 Figma상 확정값으로 판정할 수 없다.**

스크린샷: `0009-figma-recheck-canvas-108-2562.png`, `0009-figma-recheck-core-120-574.png`.

## Q5. 구매 복원과 계정 충돌

**판정: 확인함·없음.** 복원 시트 5종과 화면 밖 IA 메모를 모두 검색했지만 `다른 계정`, `구글 계정`, `기기 변경`, `소유`는 각각 0개다. 계정 충돌·소유권 규칙은 설계되어 있지 않다.

| 검색어 | 판정 | 본 범위·방법 | 근거 노드 |
|---|---|---|---|
| `다른 계정` | 확인함·없음 | 캔버스 전체 화면 안·밖 텍스트 + 복원 5종 전수 검색 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562), [`147:574`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-574)~[`147:619`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-619) |
| `구글 계정` | 확인함·없음 | 동일. [`147:641`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-641)의 `Google Play BillingClient`는 스토어 API명이지 구글 계정 충돌 문구가 아니다. | [`147:641`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-641) |
| `기기 변경` | 확인함·없음 | 캔버스 전체 화면 안·밖 텍스트 전수 검색 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| `소유` | 확인함·없음 | 캔버스 전체 화면 안·밖 텍스트 전수 검색 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |

| 상태 | 노드 ID | 본문 원문 |
|---|---|---|
| 복원 없음 | [`147:609`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-609) | [`147:615`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-615) `복원할 구매 내역이 없어요`<br>[`147:616`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-616) `현재 계정에서 확인할 수 있는`<br>`이전 구매가 없습니다.` |
| 복원 오류 | [`147:619`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-619) | [`147:625`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-625) `구매 정보를 확인하지 못했어요`<br>[`147:626`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-626) `잠시 후 다시 시도해주세요.` |

참고로 기본 시트는 [`147:581`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=147-581) `이전에 구매한 Beauty Report를` / `현재 계정에서 다시 확인할 수 있어요.`라고만 한다. “현재 계정”이 무엇으로 식별되는지, 다른 계정 구매를 어떻게 다루는지는 없다.

스크린샷: `0009-figma-recheck-style-my-143-2170.png`, `0009-figma-recheck-states-143-2172.png`.

## Q6. Room 생성 로그인

**판정: 확인함·없음.** 친구 없음 [`106:2296`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=106-2296)과 공유 시트 [`108:2984`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2984) 사이에 로그인 화면을 끼우는 선·메모는 없다. 더 엄격히 말하면 이 두 화면을 직접 잇는 빨간 선·IA 문장도 없다.

| 확인 질문 | 판정 | 이번 근거 |
|---|---|---|
| `친구 초대하기` → 공유 시트 사이 로그인 | 확인함·없음 | [`106:2326`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=106-2326) `친구 초대하기`; [`106:2296`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=106-2296), [`108:2984`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2984) 및 CHEMISTRY 화면 밖 메모에 로그인 문구 없음 |
| `106:2296` → `108:2984` 직접선 | 확인함·없음 | CHEMISTRY 직속 빨간 도형을 전수 확인. 존재하는 상태선은 [`122:660`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-660)+[`122:661`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-661)의 `Room Empty → Active Ranking`이며 라벨 [`122:662`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-662)은 `친구 1명 이상 참여`다. 공유 시트로 가는 선은 아니다. |
| 공유 링크 진입선 | 확인함·있음 | [`122:668`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-668)+[`122:669`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-669), 라벨 [`122:670`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-670) `공유 링크 진입`은 공유 시트 오른쪽에서 친구 랜딩 [`108:3599`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3599) 방향으로 간다. |
| 초대 결과 → 앱 인계 | 확인함·있음 | 결과 [`108:3641`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-3641)에서 handoff [`112:985`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-985)로 빨간 선 [`122:671`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-671)+[`122:672`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-672), 라벨 [`122:673`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-673) `14 결과 CTA → 앱 설치 / 실행` |

초대받은 친구 결과 CTA의 화면 밖 메모 원문은 다음과 같다.

| 노드 ID | 원문 |
|---|---|
| [`108:4086`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4086) | `CTA: "나도 내 Beauty Room 만들기"` |
| [`108:4087`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4087) | `↓ 앱 설치 여부 확인` |
| [`108:4088`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4088) | `✓ 앱 설치됨 → 앱 실행 → Profile 연결` |
| [`108:4089`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4089) | `✗ 앱 미설치 → Store → 설치 → Profile 연결` |
| [`108:4090`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4090) | `→ CHEMISTRY HOME — ROOM EMPTY` |
| [`108:4091`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4091) | `⚠ OWNER RANKING으로 바로 보내지 않음` |
| [`108:4092`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-4092) | `   새 Room = 친구 0명 → ROOM EMPTY 진입` |
| [`122:675`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=122-675) | `14 “나도 내 Beauty Room 만들기” → APP → Profile Handoff → CHEMISTRY HOME · ROOM EMPTY` |

이 메모는 `Profile 연결`을 쓰지만 `로그인` 또는 계정 연결 화면 [`112:1017`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=112-1017)을 명시하지 않는다.

스크린샷: `0009-figma-recheck-chemistry-143-2171.png`, `0009-figma-recheck-canvas-108-2562.png`.

## Q7. 분석 기록 상한과 리포트 표시

**판정: 확인함·있음.** 기록 상한 문구는 명시되어 있다. 반면 기록 행에 `리포트 있음` 같은 별도 표시나 리포트 아이콘은 없다.

| 확인 질문 | 판정 | 이번 근거 |
|---|---|---|
| `10회 / 최대 / 보관` | 확인함·있음 | [`144:624`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-624) 원문: `분석 기록은 최대 10회까지 보관됩니다.` |
| 화면 밖 메모의 동일 상한 | 확인함·없음 | 화면 프레임 밖 전체 텍스트에서 `10회`와 `최대 10회`는 0개. 상한은 화면 내부 [`144:624`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-624)에만 있다. |
| `리포트 있음` 텍스트·배지 | 확인함·없음 | [`144:576`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-576)의 텍스트 전수 확인. 현재 행에는 [`144:600`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-600) `현재 사용 중`, 링크 [`144:602`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-602) `현재 결과 보기 →`; 이전 행에는 [`144:613`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-613), [`144:622`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-622) `결과 보기 →`만 있다. |
| 리포트 아이콘 | 확인함·없음 | 아이콘형 자손을 유형·이름으로 전수 조회. 화면 내 벡터는 상태바 [`144:629`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-629), [`144:635`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-635), [`144:638`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-638)과 뒤로가기 [`144:632`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-632)뿐이다. [`144:592`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-592)는 프로필 placeholder이고, [`144:599`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=144-599)는 `현재 사용 중` 배지다. |

`결과 보기 →`는 결과 존재를 간접적으로 시사하지만, 구매 리포트 보유 여부를 명시하는 표시로 보기는 어렵다.

스크린샷: `0009-figma-recheck-style-my-143-2170.png`.

## 퍼블리시티권 표현 별도 점검

| 점검 항목 | 결과 | 본 범위 | 근거 노드 |
|---|---|---|---|
| 실제 연예인 이름·사진 | 발견 없음 | 5개 고해상도 스크린샷 육안 확인 + 캔버스 전체 텍스트 확인 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| `○○ st` 형식 | 발견 없음 | 캔버스 전체 텍스트 패턴 검색 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |
| `닮은꼴` 표현 | 발견 없음 | 캔버스 전체 텍스트 exact 검색 | [`108:2562`](https://www.figma.com/design/PCUCRGz6FRNmOrhynuHulp?node-id=108-2562) |

## 부록 A. `get_metadata`의 CONNECTOR / LINE / VECTOR 전수 목록

`get_metadata`가 노출한 기하 노드는 103개다. CORE의 정돈된 빨간 화살표는 `RECTANGLE + POLYGON` 수동 도형이어서 아래 세 타입 목록에는 포함되지 않는다. STYLE·MY의 손그림 선은 `VECTOR`로 잡힌다.

| 타입 | 수 | 노드 ID 전부 |
|---|---:|---|
| CONNECTOR | 0 | 없음 |
| LINE | 84 | `158:607`, `158:618`, `158:629`, `158:672`, `158:691`, `158:711`, `158:721`, `158:735`, `158:747`, `108:2805`, `108:2877`, `108:2896`, `108:2916`, `108:2926`, `108:2940`, `108:2952`, `108:3081`, `108:3104`, `108:3196`, `108:3206`, `108:3210`, `108:3230`, `108:3264`, `108:3268`, `108:3298`, `108:3308`, `108:3312`, `108:3328`, `169:594`, `108:3348`, `108:3382`, `108:3389`, `108:3428`, `108:3441`, `108:3461`, `108:3468`, `108:3503`, `108:3516`, `108:3532`, `170:592`, `108:3552`, `108:3568`, `108:3590`, `142:600`, `142:602`, `108:3922`, `108:3924`, `132:574`, `132:581`, `108:3945`, `106:2398`, `106:2400`, `126:600`, `126:602`, `126:627`, `106:2023`, `106:2046`, `106:2063`, `106:2080`, `106:2097`, `106:2153`, `106:2164`, `106:2170`, `106:2196`, `106:2252`, `129:604`, `129:615`, `129:621`, `129:656`, `129:660`, `129:715`, `144:596`, `144:611`, `144:620`, `146:698`, `146:710`, `108:3016`, `108:3684`, `108:3689`, `108:3694`, `108:3699`, `108:2692`, `108:2699`, `108:3053` |
| VECTOR | 19 | `108:3414`, `108:3415`, `108:3416`, `108:3419`, `143:2209`, `143:2210`, `143:2211`, `143:2212`, `143:2213`, `143:2214`, `143:2216`, `143:2217`, `143:2229`, `143:2230`, `143:2231`, `143:2233`, `143:2235`, `143:2241`, `143:2242` |

## 부록 B. 화면별 prototype reaction 재집계

| 화면 노드 ID | 화면 이름 | 표시 | reaction 수 |
|---|---|---:|---:|
| `158:574` | home-wireframe | 예 | 0 |
| `158:657` | free-beauty-mood-result · long | 예 | 0 |
| `108:2714` | photo-guide | 예 | 0 |
| `108:2772` | photo-confirm | 예 | 0 |
| `108:2812` | analysis-loading | 예 | 0 |
| `108:4120` | Splash | 예 | 0 |
| `108:2862` | free-beauty-mood-result | 예 | 0 |
| `108:3056` | checkout | 예 | 0 |
| `108:3131` | payment-success | 예 | 0 |
| `108:3175` | paid-beauty-report-hair | 예 | 0 |
| `108:3277` | paid-beauty-report-makeup | 예 | 0 |
| `108:3410` | hair-recommendation-detail | 예 | 0 |
| `108:3481` | makeup-recommendation-detail | 예 | 0 |
| `142:574` | my-tab-profile-exists | 예 | 0 |
| `108:3897` | home-post-analysis-unpurchased | 예 | 0 |
| `108:3983` | ARCHIVE_DUPLICATE__chemistry-home-room-empty | 아니오 | 0 |
| `108:4038` | ARCHIVE_DUPLICATE__chemistry-home-no-mood | 아니오 | 0 |
| `106:2374` | my-tab-no-profile | 예 | 0 |
| `112:1017` | account-link-sign-in | 예 | 0 |
| `126:574` | home-post-analysis-purchased | 예 | 0 |
| `106:2005` | style-home-pre-analysis | 예 | 0 |
| `127:576` | style-post-analysis-for-you | 예 | 0 |
| `106:2131` | style-content-detail-pre-analysis | 예 | 0 |
| `129:582` | style-content-detail-post-analysis | 예 | 0 |
| `106:2457` | product-recommendation-list-post-analysis | 예 | 0 |
| `141:1770` | product-recommendation-list-post-analysis | 예 | 0 |
| `144:576` | analysis-history | 예 | 0 |
| `146:603` | saved-styles | 예 | 0 |
| `146:683` | purchase-history | 예 | 0 |
| `147:574` | restore-purchase-default | 예 | 0 |
| `147:587` | restore-purchase-loading | 예 | 0 |
| `147:597` | restore-purchase-success | 예 | 0 |
| `147:609` | restore-purchase-not-found | 예 | 0 |
| `147:619` | restore-purchase-error | 예 | 0 |
| `148:656` | delete-account-confirmation | 예 | 0 |
| `148:576` | privacy-and-security | 예 | 0 |
| `149:574` | logout-confirmation | 예 | 0 |
| `149:597` | account-guest | 예 | 0 |
| `149:630` | account-connected | 예 | 0 |
| `108:2984` | share-bottom-sheet-default | 예 | 0 |
| `108:3714` | owner-ranking | 예 | 0 |
| `108:3599` | beauty-chemistry-friend-landing | 예 | 0 |
| `108:3641` | beauty-chemistry-result-web-invite | 예 | 0 |
| `106:2260` | ChemistryHome_NoMood | 예 | 0 |
| `106:2296` | ChemistryHome_NoFriends | 예 | 0 |
| `112:985` | profile-handoff-loading | 예 | 0 |
| `108:2659` | sample-result-bottom-sheet | 예 | 0 |
| `108:3021` | share-bottom-sheet-copied | 예 | 0 |
| `108:3112` | payment-processing | 예 | 0 |
| `108:3153` | payment-failure | 예 | 0 |
| `112:993` | photo-error-no-face | 예 | 0 |
| `112:1002` | photo-error-multiple-faces | 예 | 0 |
| `112:1010` | photo-permission-denied | 예 | 0 |

합계: 화면 53개, reaction 0개, reaction 보유 화면 0개, 조회 누락 0개.
