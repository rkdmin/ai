---
plan: "0002"
title: "Phase 1 — 얼굴 인식 정확도 + RAG 품질"
phase: 1
adr: ["0002"]
milestone: "v1.0"
status: In Progress
last-verified: "2026-09-15"
---
# Plan 0002 · Phase 1 — 얼굴 인식 정확도 + RAG 품질

> 결정 배경: [ADR 0002](../decisions/0002-phase1-face-accuracy-rag.md) · 전체 진행 상황: [ROADMAP](../ROADMAP.md)

체크 표기는 [`README.md`](./README.md) 의 규약을 따른다.

## 완료 기준

골든셋 자가평가 정확도 90% 이상 (10장 중 9장 납득).

## 구현

### 1-4. RAG 데이터 검증 및 보강 ✅
- [x] 얼굴형별 추천/비추천 카드 검토 — 7가지 얼굴형 모두 recommend 3장 + avoidCard 보유
- [x] `feature-tips.json` 케이스 확장 — `ANALYZE_PROMPT` 37개 features 1:1 매칭 확인. 추가 후보(이중턱·비대칭 등)는 v1.x
- [x] 모순 케이스 테스트 — RAG description ↔ `ANALYZE_PROMPT` 정의(gonial 기반 사각형) 일관성 확인
- [x] 퍼스널컬러 미정 상태 카드 품질 검증 — `ragUtils.buildMakeupContext`가 미정 시 "색상 정보 없음 — 질감·위치·방법 위주" 안내 컨텍스트 생성
- [x] 데이터 정정: `face-hair.json` heart/long의 priority 중복(1,2,2 / 1,1,2) → 정상화(1,2,3)

### 1-6. 프론트 코드 정리: Claude → Gemini 단일 통합 ✅
- [x] `src/api/gemini.js`에 `analyzeFace`, `generateHairCards`, `generateMakeupCards`, `generateTotalCards` 구현
- [x] `src/api/ai.js` 디폴트 라우팅을 Gemini로 변경 (mock/gemini 2분기로 단순화)
- [x] `src/api/claude.js` 삭제
- [x] 환경변수 `VITE_AI_PROVIDER`, `VITE_ANTHROPIC_API_KEY` 제거
- [ ] 회귀 확인: mock 모드와 실제 호출 모두 정상 (사용자 직접 테스트 필요)

### 1-7. 테스트 전략
- [ ] 얼굴형 골든셋 10~15장으로 시작
- [ ] 샘플별 기대 얼굴형 / feature / 메모 기준 정리
- [ ] 프롬프트 또는 RAG 변경 시 eval 재실행
- [ ] exact match보다 납득률/금지 출력/충돌 여부를 회귀 기준으로 사용
- [ ] 골든셋 부족 케이스(다이아몬드/땅콩 등 경계형) 정성 분석 노트 유지

### 1-8. 개발자용 프롬프트/응답 인스펙터 (출시 전 제거 예정) ✅ — 운영 안전장치
- [ ] 운영 빌드에서 `VITE_DEV_INSPECTOR` 미설정 시 인스펙터 코드/UI 0 byte
- [ ] 인스펙터에서 표시하는 사진은 메모리 내에서만 보관 (localStorage 저장 금지)
- [ ] API 키는 어떤 경우에도 인스펙터에 노출하지 않음
- [ ] Phase 6 (Capacitor 패키징) 직전에 제거 또는 dev-only flavor로 분리

### 핵심 체크
- [x] MediaPipe 랜드마크 추출 로컬 스크립트 구현 (`tools/landmark.py`, Python 설치 후 실행 가능)
- [x] 수치 계산 로직 구현 (Phase 2 이관 가능한 형태 — `compute_ratios()` 단독 함수)
- [x] Gemini 프롬프트에 수치 슬롯 포함 (`analyzeFace(image, faceRatios)` 시그니처)
- [x] 측면 이미지 전달 구조 — **v1.0 제외 결정** (1-3 참조)
- [x] `claude.js` 제거, `ai.js` 디폴트 Gemini 전환
- [x] RAG 데이터 검토 완료 (1-4)
- [x] feature-tips 매칭 확인 — 추가 확장은 v1.x
- [x] 피드백 수집 UI — **v1.0 제외** (1-5 참조)
- [ ] 10장 테스트에서 9장 이상 납득 (실사용자 자가평가 — 1-7/사용자 직접 테스트 항목)
- [x] AI eval 골든셋 회귀 통과 — `eval-face`(Claude Sonnet) 9/9 hits (2026-05-31, `tools/eval-claude-results.json`). 단 Claude 기반 프롬프트 sanity check이며, 운영 정확도(Gemini)는 `tools/eval.py` 로 별도 확인 필요
- [x] 경계형 얼굴형(다이아몬드/땅콩 등) fallback UX 정의 (faceType === '판정 어려움' 시 안내 카드 + 다시 찍기 버튼)
- [x] 개발자용 프롬프트/응답 인스펙터 동작 (`VITE_DEV_INSPECTOR=true`)
- [x] 운영 빌드에서 인스펙터 코드 미포함 확인 (5.09 KB 트리 셰이킹 검증)

## 사용자 직접 확인

> 코드로 검증할 수 없어 사람이 직접 해봐야 하는 항목이다.

### 정확도 체감 테스트
- [ ] 내 정면 사진으로 분석 → 결과 얼굴형이 납득되는가
- [ ] 같은 나의 다른 정면 사진(조명 다름, 헤어 다름) 3장으로 같은 얼굴형이 나오는가 (안정성)
- [ ] 가족/친구 5명에게 분석 시켜보고 본인 자가평가와 일치하는가 (10장 중 9장 목표)
- [ ] 일부러 광각 카메라로 찍은 사진을 넣었을 때 분석이 흔들리는지 (PHOTO_GUIDE 위반 케이스)

### 경계형 / 실패 케이스
- [ ] 다이아몬드형 vs 하트형이 헷갈릴 만한 사진을 일부러 시도 → "판정 어려움" 안내 카드가 자연스럽게 나오는가
- [ ] 안경 끼고 있는 사진 → 분석이 거부되거나 결과 신뢰도가 낮다고 표시되는가
- [ ] 마스크 쓴 사진 → 사용자에게 사진 다시 찍기 안내가 나오는가

### RAG 추천 품질
- [ ] 추천 헤어 3장이 내 얼굴형 기준으로 납득되는가 (특히 Best Pick)
- [ ] Avoid 카드의 "왜 안 좋은지" 설명이 모순 없는가 (추천 카드와 충돌하는 표현이 없는지)
- [ ] 메이크업 카드의 컬러 추천이 내 퍼스널컬러 기준으로 납득되는가
- [ ] feature-tips가 적용된 케이스(예: "광대 넓음" 입력)와 안 된 케이스 카드가 실제로 다르게 나오는가

### 코드 정리 확인
- [ ] 브라우저 콘솔에서 `import.meta.env.VITE_AI_PROVIDER`가 더 이상 필요 없는지
- [ ] `src/api/claude.js` 파일이 삭제되었는지 (저장소에서 검색)
- [ ] mock 모드(`VITE_MOCK=true`)에서도 카드까지 정상 진입하는가

### 개발자용 인스펙터
- [ ] `VITE_DEV_INSPECTOR=true`로 띄우면 🐞 버튼이 보이는가
- [ ] 분석 1회 후 인스펙터에서 시스템 프롬프트 / 유저 프롬프트 / 원시 응답이 그대로 보이는가
- [ ] 프롬프트·응답 복사 버튼이 동작하는가
- [ ] 같은 사진으로 "재실행" 버튼을 눌렀을 때 응답이 얼마나 흔들리는지 확인 가능한가
- [ ] `VITE_DEV_INSPECTOR` 미설정 빌드에서는 🐞 버튼이 보이지 않는가
