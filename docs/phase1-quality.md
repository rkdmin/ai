# Phase 1 — 얼굴 인식 정확도 + RAG 품질 개선

> 가장 먼저 해야 할 것. 추천의 신뢰도가 앱의 핵심 가치다.
> 목표: 얼굴형 분석 정확도 90%+

> **이 단계의 범위**: MediaPipe 측정 로직과 Gemini 판정 품질을 **로컬 Python 스크립트**로 먼저 검증한다.
> 정식 FastAPI 서버, 인증, Rate Limit, 배포는 Phase 2에서 셋업한다.
> Phase 1에서 작성한 측정/프롬프트 코드는 Phase 2의 `services/` 모듈로 이관해 재사용한다.

---

## 현재 문제점

**Gemini Vision이 사진만 보고 추정**하면 조명/각도/헤어에 흔들린다.
프롬프트 개선만으로는 한계가 있다.

또한 현재 코드에는 Claude 기반 분석 호출(`src/api/claude.js`)이 살아있다. Phase 1에서 Gemini로 단일 통합하며 `claude.js`를 제거한다.

---

## 확정된 해결 방식: MediaPipe + Gemini 하이브리드

> MediaPipe는 수치 측정, Gemini는 수치 + 이미지 종합 해석

```
사진 업로드
    ↓
[1단계] MediaPipe Face Mesh (Python 스크립트)
    → 468개 랜드마크 좌표 추출
    → 핵심 비율값 계산
    ↓
[2단계] Gemini 2.5 Flash
    → 정면 수치 + 정면 이미지 전달
    → 얼굴형 확정
    → 이목구비 특징 분석
    → RAG 카드 생성
```

### MediaPipe 실행 위치

- 운영 시: 백엔드(Python) — Phase 2 이후
- Phase 1: 로컬 Python 스크립트로 평가셋을 돌려본다 (서버 불필요)
- 모바일 패키징과 무관하게 분석 파이프라인은 동일 (앱은 사진 업로드/결과 표시만 담당)

---

## 1-1. MediaPipe 측정 모듈 작성 (로컬)

**실행 위치:** 로컬 Python 스크립트
**패키지:** `mediapipe`
**산출물:** `tools/landmark.py` (또는 노트북) — Phase 2에서 `backend/services/mediapipe_service.py`로 이관

### 추출할 핵심 랜드마크

| 측정값 | 사용 랜드마크 | 용도 |
|--------|------------|------|
| 이마폭 | #54 ↔ #284 | 얼굴형 분류 |
| 광대폭 | #234 ↔ #454 | 얼굴형 분류 |
| 턱폭 | #172 ↔ #397 | 얼굴형 분류 |
| 얼굴 길이 | #10 ↔ #152 | 얼굴형 분류 |
| 턱 각도 | #58, #132, #361, #288 | 사각형/둥근형 구분 |
| 상안부 | #10 ↔ 눈썹선 | 상·중·하안부 비율 |
| 눈 간격 | 좌우 눈 내안각 | 이목구비 특징 |
| 눈 크기 | 상하 눈꺼풀 | 이목구비 특징 |
| 입술 폭 | 입 꼬리 좌우 | 이목구비 특징 |

### 계산할 비율값

```python
ratios = {
    "foreheadRatio": forehead_width / cheek_width,
    "jawRatio": jaw_width / cheek_width,
    "aspectRatio": face_height / cheek_width,
    "jawAngle": calc_jaw_angle(landmarks),
    "upperFaceRatio": upper / face_height,
    "midFaceRatio": mid / face_height,
    "lowerFaceRatio": lower / face_height,
}
```

---

## 1-2. Gemini 프롬프트 설계

### 수치 전달 방식

수치에 절대 임계값을 박아넣지 않고, **참고 지표**로 전달한다.
최종 얼굴형 판정은 Gemini가 수치 + 이미지 + 얼굴형 정의를 종합해 결정한다.

### 7가지 얼굴형 분류 위험 + Fallback

7가지(계란/둥근/사각/하트/긴/다이아몬드/땅콩) 분류는 특히 다이아몬드/하트, 땅콩/사각 사이 경계가 모호하다.
- 골든셋에서 두 후보 사이 fluctuation이 큰 케이스를 별도 표시
- Gemini가 확신 부족이면 `"판정 어려움"` 응답을 허용하고, 프론트는 `"여러 얼굴형 특징이 섞여 있어요"` 케이스 카드로 안내

---

## 1-3. 측면 사진 정책 (v1.0 제외)

v1.0은 **정면 1장만** 받는다. 측면(90도·45도) 기능은 v1.x 이후로 미룸.

이유:
- 평가 인프라(`tools/eval.py`)가 측면을 활용하지 못해 가치 측정 불가
- 사용자가 측면 사진까지 찍는 마찰 비용이 큼 (출시 직전 friction 최소화)
- 측면 데이터의 모델 정확도 기여도가 정량 검증되지 않음

재도입 조건:
- 골든셋에 측면 사진 추가 + `eval.py` 4-mode 비교 (정면 only vs 정면+측면)에서 정확도 +5% 이상 기여 확인 시
- `src/data/촬영가이드 측면.png`는 보존 (재도입 대비)

---

## 1-4. RAG 데이터 검증 및 보강 ✅

- [x] 얼굴형별 추천/비추천 카드 검토 — 7가지 얼굴형 모두 recommend 3장 + avoidCard 보유
- [x] `feature-tips.json` 케이스 확장 — `ANALYZE_PROMPT` 37개 features 1:1 매칭 확인. 추가 후보(이중턱·비대칭 등)는 v1.x
- [x] 모순 케이스 테스트 — RAG description ↔ `ANALYZE_PROMPT` 정의(gonial 기반 사각형) 일관성 확인
- [x] 퍼스널컬러 미정 상태 카드 품질 검증 — `ragUtils.buildMakeupContext`가 미정 시 "색상 정보 없음 — 질감·위치·방법 위주" 안내 컨텍스트 생성
- [x] 데이터 정정: `face-hair.json` heart/long의 priority 중복(1,2,2 / 1,1,2) → 정상화(1,2,3)

### v1.x 개선 후보
- `face-makeup.avoidCard.examples` 배열을 `ragUtils.buildMakeupContext` 출력에 포함 (현재 title/reason만 사용)
- feature-tips 확장 — 이중턱, 비대칭 얼굴, 처진 콧대 등 (`ANALYZE_PROMPT`와 동시 갱신 필요)
- RAG 인물 사진 출처 표기 (법적 안전성)

---

## 1-5. 분석 품질 피드백 수집 — **v1.0 제외**

카드 상세 하단 피드백 위젯(👍/👎 + 부정 사유) 도입을 검토했으나 v1.0은 제외.

이유:
- 출시 직전 UI 마찰 최소화
- 일반 피드백 위젯 클릭률이 매우 낮아 (< 1%) 의사결정 데이터로 활용도 부족
- 사용자 자가 테스트 + 골든셋(`tools/eval.py`)으로 추천 품질 측정 가능

재검토 시점: v1.1 이후 광고/카드 잠금 도입과 함께 사용자 행동 데이터(클릭률·리텐션) 축적 후.

---

## 1-6. 프론트 코드 정리: Claude → Gemini 단일 통합 ✅

- [x] `src/api/gemini.js`에 `analyzeFace`, `generateHairCards`, `generateMakeupCards`, `generateTotalCards` 구현
- [x] `src/api/ai.js` 디폴트 라우팅을 Gemini로 변경 (mock/gemini 2분기로 단순화)
- [x] `src/api/claude.js` 삭제
- [x] 환경변수 `VITE_AI_PROVIDER`, `VITE_ANTHROPIC_API_KEY` 제거
- [ ] 회귀 확인: mock 모드와 실제 호출 모두 정상 (사용자 직접 테스트 필요)

> 단, 이 항목은 Phase 2(백엔드 분리) 직전까지는 프론트에서 직접 호출하는 형태로 유지된다.
> 최종적으로 Phase 2에서 백엔드로 이관된다.

---

## 1-7. 테스트 전략

- [ ] 얼굴형 골든셋 10~15장으로 시작
- [ ] 샘플별 기대 얼굴형 / feature / 메모 기준 정리
- [ ] 프롬프트 또는 RAG 변경 시 eval 재실행
- [ ] exact match보다 납득률/금지 출력/충돌 여부를 회귀 기준으로 사용
- [ ] 골든셋 부족 케이스(다이아몬드/땅콩 등 경계형) 정성 분석 노트 유지

---

## 1-8. 개발자용 프롬프트/응답 인스펙터 (출시 전 제거 예정) ✅

> **목적**: Gemini에게 **정확히 어떤 프롬프트가 나가고 어떤 응답이 오는지** 눈으로 확인.
> 프롬프트 튜닝과 회귀 분석 속도를 끌어올리기 위한 **개발 전용** UI.
> v1.0 출시 직전 `src/devtools/` 디렉토리를 통째로 제거하거나 dev-only flavor로 분리한다.

### 활성화 방식

- 환경변수 `VITE_DEV_INSPECTOR=true` 일 때만 노출
- 빌드 타임 상수(`import.meta.env.VITE_DEV_INSPECTOR === 'true'`) 분기로 운영 빌드에서 트리 셰이킹
- 컴포넌트 위치: `src/devtools/PromptInspector.jsx`, `src/devtools/inspector.js` (운영 코드 import 단방향)
- **검증된 트리 셰이킹**: `VITE_DEV_INSPECTOR` 미설정 빌드 시 인스펙터 코드 ~5KB 제거 확인

### 인스펙터에서 볼 수 있어야 하는 것

| 항목 | 내용 |
|------|------|
| 호출 종류 | `analyzeFace` / `generateHairCards` / `generateMakeupCards` / `generateTotalCards` / `generateStyledPhoto` |
| 모델명 | 실제 호출된 Gemini 모델 ID |
| 시스템 프롬프트 | 풀텍스트 (마스킹 없음 — 개발자만 봄) |
| 유저 프롬프트 | RAG 컨텍스트 + MediaPipe 수치 + 사용자 입력 모두 포함된 최종 텍스트 |
| 첨부 이미지 | 정면 썸네일 + 해상도·용량 |
| 원시 응답 | Gemini가 돌려준 raw text (JSON 파싱 전) |
| 파싱 결과 | 앱이 실제로 사용하는 객체 (`faceType`, `features`, `faceRatios`, 카드 배열 등) |
| 소요 시간 | 호출~응답까지 ms |
| 토큰 사용량 | 가능하면 input/output 토큰 (Gemini API가 제공하면) |

### UI 동작

- 분석 결과 화면 / 카드 목록 / 카드 상세에서 **🐞 인스펙터** 플로팅 버튼
- 클릭 시 사이드 패널 또는 모달로 **최근 N건** 호출 히스토리 표시
- 각 호출별로 **프롬프트 / 응답 / 파싱 결과** 탭
- **복사 버튼** (프롬프트, 응답 각각) — 골든셋 노트로 바로 붙여넣기
- **JSON 다운로드** — 호출 1건을 `.json`으로 저장 (회귀 비교용)
- **재실행 버튼** — 동일 입력으로 한 번 더 호출 (변동성 확인)

### 운영 안전장치

- [ ] 운영 빌드에서 `VITE_DEV_INSPECTOR` 미설정 시 인스펙터 코드/UI 0 byte
- [ ] 인스펙터에서 표시하는 사진은 메모리 내에서만 보관 (localStorage 저장 금지)
- [ ] API 키는 어떤 경우에도 인스펙터에 노출하지 않음
- [ ] Phase 6 (Capacitor 패키징) 직전에 제거 또는 dev-only flavor로 분리

---

## Phase 1 저장소/구현 기준 체크리스트

> 위 체크는 **코드/문서/저장소 기준으로 확인 가능한 항목**이다.
> 직접 써봐야 하는 항목은 아래 `🙋 사용자 직접 테스트 체크리스트`에서 따로 체크한다.

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

---

## 🙋 사용자 직접 테스트 체크리스트 (Phase 1)

> 자동화 테스트와 별개로, **나(사용자)가 직접 손과 눈으로 확인**해야 신뢰가 잡히는 항목들.

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
