---
last-verified: "2026-08-12"
---

# RAG 데이터 사용 가이드

> ⚠️ **병합은 Python 이 아니라 Gemini 가 한다.**
> `rag_service.build_*_context()` 는 아래 규칙을 **텍스트로 조립해 프롬프트에 넣을 뿐**,
> 코드에서 실제로 두 데이터를 합치지 않는다. 즉 병합은 결정적(deterministic)이지 않고
> 모델이 지시를 따르는 데 의존한다. 규칙을 고치면 반드시 `/eval-face` 로 회귀를 돌린다.
>
> | 뷰 | 구현 함수 |
> |----|----------|
> | ① 헤어 | `build_hair_context()` |
> | ② ③ 메이크업 | `build_makeup_context()` (퍼스널컬러 유무로 분기) |
> | ④ 종합 | `build_total_context()` = 메이크업 + 헤어 이어붙이기 |

## 파일 구조 overview

```
face-makeup.json        → 얼굴형별 메이크업 베이스 (위치/방법)
face-hair.json          → 얼굴형별 헤어 추천
personal-color-makeup.json → 퍼스널컬러별 컬러 팔레트
feature-tips.json       → 부위별 보정 팁 (보정 레이어)
```

---

## 뷰별 RAG 사용 방식

### 뷰 ① 얼굴형 + 헤어

**사용 파일:** `face-hair.json`

**흐름:**
```
분석 결과 입력: 얼굴형 (Gemini 판정값)
→ face-hair.json에서 해당 faceType 조회
→ recommend[] 전체 + avoid[] 반환
→ AI가 reason/coachComment 표현만 변형하여 전달
```

**AI 역할:** reason과 coachComment를 자연스러운 말투로 변형, 내용 추가/삭제 금지

---

### 뷰 ② 얼굴형 + 메이크업

**사용 파일:** `face-makeup.json`

**흐름:**
```
분석 결과 입력: 얼굴형 (Gemini 판정값)
→ face-makeup.json에서 해당 faceType 조회
→ baseSkin + recommendCards[] 3개 + avoidCard 반환
→ 카드별 메이크업 파트 기준 추천 제품 키워드 후보 추출
→ 쿠팡파트너스 링크는 별도 매핑 레이어에서 주입
→ AI가 각 카드의 파트별 reason + coachComment 표현만 변형하여 전달
```

**AI 역할:** 카드 구조 그대로 유지, reason/coachComment 표현만 변형, 내용 추가/삭제 금지

---

### 뷰 ③ 얼굴형 + 퍼스널컬러 + 메이크업

**사용 파일:** `face-makeup.json` + `personal-color-makeup.json`

**흐름:**
```
분석 결과 입력: 얼굴형 (Gemini 판정값) + 퍼스널컬러 (사용자 확정)
→ face-makeup.json에서 해당 faceType 조회 (위치/방법 레이어)
→ personal-color-makeup.json에서 해당 personalColor 조회 (컬러 레이어)
→ 두 데이터를 파트별로 병합
  - 위치/방법 → face-makeup 기준
  - 컬러(colorVibe) → personal-color-makeup으로 오버라이드
→ 병합 결과에서 제품 추천 키워드 후보 추출
→ 쿠팡파트너스 링크는 별도 매핑 레이어에서 주입
→ AI가 병합된 정보를 카드 형태로 자연스럽게 전달
```

**병합 규칙:** (`rag_service.py` 의 `[병합 규칙 — 반드시 준수]` 블록과 1:1로 일치해야 한다)
- 위치·형태·제형(`zone`, `shape`, `texture`, `method`) → face-makeup 기준 유지
- 컬러(`colorVibe`) → personal-color-makeup 으로 덮어쓰기
- **퍼스널컬러 카드에 있는 파트는 종류를 가리지 않고 전부** 그 컬러를 따른다
- 퍼스널컬러 카드에 **없는** 파트는 얼굴형 기준 그대로. 색을 지어내지 않는다

> **파트를 열거하지 않는 이유:** `personal-color-makeup.json` 의 파트 구성이 4개 톤마다 다르다.
>
> | 퍼스널컬러 | 카드가 담는 파트 |
> |---|---|
> | spring_warm | lip, blush, eyeshadow, eyebrow, eyeliner, **highlighter** |
> | summer_cool | lip, blush, baseSkin, eyeshadow, eyebrow, eyeliner |
> | autumn_warm | lip, eyeshadow, eyebrow, blush, baseSkin, **shading** |
> | winter_cool | **hair**, lip, baseSkin, eyebrow, eyeliner, eyeshadow, blush |
>
> `shading` 은 autumn_warm 에만, `highlighter` 는 spring_warm 에만 있다. 고정 목록으로 지시하면
> 없는 파트의 색을 지어내거나, 있는 파트를 그냥 지나친다. 그래서 규칙으로 바꿨다.
>
> ⚠️ **카드 생성 프롬프트에는 회귀 도구가 없다.** `/eval-face` 는 `ANALYZE_PROMPT`(얼굴형 판정)
> 전용이고, `backend/test_integration.py` 는 Gemini 를 mock 하므로 출력 품질을 보지 않는다.
> 이 블록을 고치면 수동으로 카드 결과를 확인해야 한다.

**AI 역할:** 병합 결과를 카드 형태로 자연스럽게 설명, 두 데이터 외 내용 추가 금지

---

### 뷰 ④ 얼굴형 + 퍼스널컬러 + 메이크업 + 헤어

**사용 파일:** `face-makeup.json` + `personal-color-makeup.json` + `face-hair.json`

**흐름:**
```
분석 결과 입력: 얼굴형 (Gemini 판정값) + 퍼스널컬러 (사용자 확정)
→ 뷰 ③과 동일하게 메이크업 카드 구성
→ face-hair.json에서 해당 faceType 조회하여 헤어 추천 추가
→ 메이크업 카드 + 헤어 추천을 함께 전달
```

**AI 역할:** 메이크업과 헤어를 자연스럽게 연결하여 전달, 각 데이터의 reason/coachComment 표현만 변형

---

## feature-tips 적용 방식 (공통)

**사용 파일:** `feature-tips.json`

**적용 시점:** 뷰 ①~④ 어디서든 사용자가 부위별 특징을 입력한 경우 추가 적용

**흐름:**
```
사용자 입력: 부위별 특징 (예: 눈꼬리 처짐, 광대 넓음)
→ feature-tips.json에서 해당 feature 조회
→ makeupTip.overrideTargets 확인
→ 기존 카드에서 해당 파트를 featureTip 내용으로 덮어쓰기
→ hairTip.overrideTargets 확인하여 헤어도 동일하게 적용
```

**충돌 우선순위:**
```
featureTip > personal-color-makeup > face-makeup > face-hair
```

**제품 키워드 반영 우선순위:**
```
featureTip > personal-color-makeup > face-makeup
```

**예시:**
```
얼굴형: 둥근형 → face-makeup: "블러셔 앞볼 원형"
퍼컬: 봄웜톤   → personalcolor: "블러셔 피치 컬러"
feature: 광대 넓음 → featureTip: "블러셔 앞볼에 더 좁게"
                              overrideTargets: ["blush"]

최종 결과: 앞볼에 좁게 + 피치 컬러 (위치는 featureTip 우선, 컬러는 퍼컬 유지)
```

---

## AI 프롬프트 원칙

```
1. RAG 데이터 외 내용 추가 금지
2. reason/coachComment는 표현만 변형, 핵심 내용 유지
3. featureTip 충돌 시 반드시 featureTip 우선 적용
4. 카드 구조(priority 순서) 변경 금지
5. avoid/avoidCard는 반드시 함께 전달
6. ai 는 모순이 생기면(충돌 발생) 모순을 해결해야함
7. AI는 쿠팡파트너스 링크를 직접 생성하거나 수정하지 않음
8. 제품 추천은 메이크업 파트 + 퍼스널컬러 기반 키워드까지만 다루고, 실제 상품 매핑은 후처리 레이어에서 수행
9. 카드 잠금, 광고 노출, 사진 생성 사용량 제한은 RAG가 아니라 UI/백엔드 정책에서 관리
```

---

## 데이터 파일별 역할 요약

| 파일 | 역할 | 오버라이드 가능 여부 |
|---|---|---|
| `face-makeup.json` | 메이크업 위치/방법 베이스 | personalcolor, featureTip에 의해 컬러/일부 방법 오버라이드 됨 |
| `face-hair.json` | 헤어 스타일 추천 베이스 | featureTip에 의해 bangs 등 일부 오버라이드 됨 |
| `personal-color-makeup.json` | 컬러 팔레트 레이어 | featureTip에 의해 일부 오버라이드 됨 |
| `feature-tips.json` | 개인 부위 보정 레이어 | 최우선순위, 오버라이드 당하지 않음 |

> **`recommendedProducts` 는 아직 없다 (계획).** `MAKEUP_CARDS_FORMAT` 에 그 필드가 없어
> 백엔드가 채우지 않고, 프론트 `MakeupDetail` 은 `PRODUCTS_MOCK` 으로 대체하고 있다.
> 도입하면 위 3개 레이어에서 뽑은 키워드로 구성하며, 쿠팡파트너스 URL 은 RAG 범위 밖의
> 운영 데이터로 후처리에서 주입한다. 도입 시점은 Phase 5
> (`docs/decisions/0007-phase5-monetization.md`).
> 위 "AI 프롬프트 원칙" 7·8번은 그때를 대비한 규칙이며 지금은 적용될 대상이 없다.
