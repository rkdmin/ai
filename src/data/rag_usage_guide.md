# RAG 데이터 사용 가이드

## 파일 구조 overview

```
face-makeup.json        → 얼굴형별 메이크업 베이스 (위치/방법)
face-hair.json          → 얼굴형별 헤어 추천
personalcolor-makeup.json → 퍼스널컬러별 컬러 팔레트
feature-tips.json       → 부위별 보정 팁 (보정 레이어)
```

---

## 뷰별 RAG 사용 방식

### 뷰 ① 얼굴형 + 헤어

**사용 파일:** `face-hair.json`

**흐름:**
```
사용자 입력: 얼굴형
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
사용자 입력: 얼굴형
→ face-makeup.json에서 해당 faceType 조회
→ baseSkin + recommendCards[] 3개 + avoidCard 반환
→ AI가 각 카드의 파트별 reason + coachComment 표현만 변형하여 전달
```

**AI 역할:** 카드 구조 그대로 유지, reason/coachComment 표현만 변형, 내용 추가/삭제 금지

---

### 뷰 ③ 얼굴형 + 퍼스널컬러 + 메이크업

**사용 파일:** `face-makeup.json` + `personalcolor-makeup.json`

**흐름:**
```
사용자 입력: 얼굴형 + 퍼스널컬러
→ face-makeup.json에서 해당 faceType 조회 (위치/방법 레이어)
→ personalcolor-makeup.json에서 해당 personalColor 조회 (컬러 레이어)
→ 두 데이터를 파트별로 병합
  - 위치/방법 → face-makeup 기준
  - 컬러(colorVibe) → personalcolor-makeup으로 오버라이드
→ AI가 병합된 정보를 카드 형태로 자연스럽게 전달
```

**병합 규칙:**
- `blush.zone`, `blush.shape` → face-makeup 기준 유지
- `blush.colorVibe` → personalcolor-makeup으로 덮어쓰기
- `lip.texture`, `lip.method` → face-makeup 기준 유지
- `lip.colorVibe` → personalcolor-makeup으로 덮어쓰기
- `eyeshadow`, `eyeliner`, `highlighter`, `shading` 컬러 → personalcolor-makeup으로 덮어쓰기

**AI 역할:** 병합 결과를 카드 형태로 자연스럽게 설명, 두 데이터 외 내용 추가 금지

---

### 뷰 ④ 얼굴형 + 퍼스널컬러 + 메이크업 + 헤어

**사용 파일:** `face-makeup.json` + `personalcolor-makeup.json` + `face-hair.json`

**흐름:**
```
사용자 입력: 얼굴형 + 퍼스널컬러
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
featureTip > personalcolor-makeup > face-makeup > face-hair
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
```

---

## 데이터 파일별 역할 요약

| 파일 | 역할 | 오버라이드 가능 여부 |
|---|---|---|
| `face-makeup.json` | 메이크업 위치/방법 베이스 | personalcolor, featureTip에 의해 컬러/일부 방법 오버라이드 됨 |
| `face-hair.json` | 헤어 스타일 추천 베이스 | featureTip에 의해 bangs 등 일부 오버라이드 됨 |
| `personalcolor-makeup.json` | 컬러 팔레트 레이어 | featureTip에 의해 일부 오버라이드 됨 |
| `feature-tips.json` | 개인 부위 보정 레이어 | 최우선순위, 오버라이드 당하지 않음 |
