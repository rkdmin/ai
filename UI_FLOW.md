# UI/UX 기능 흐름도 — Beauté AI

> 화면 상태(step) 기준으로 전체 사용자 흐름을 정리합니다.

---

## 전체 화면 흐름

```
[upload]
    │
    │  정면 사진 업로드 + 퍼스널컬러 여부 선택 → 분석 시작하기
    ▼
[analyzing]  ← 로딩 화면 (얼굴 분석 중)
    │
    │  Claude Vision API 응답 수신
    │
    ├─ 실패 → [upload] (error toast 표시)
    │
    ▼
[result]
    │
    │  퍼스널컬러를 "알아요" 선택한 경우 → 4가지 중 직접 선택 필요
    │  퍼스널컬러를 "몰라요" 선택한 경우 → AI 추정값 사용 (선택 없이 통과)
    │
    │  헤어 카드 받기 / 메이크업 카드 받기 / 종합 카드 받기
    ▼
[generatingCards]  ← 로딩 화면 (카드 생성 중)
    │
    │  Claude RAG 기반 카드 4장 생성 (추천 3 + 비추천 1)
    │
    ├─ 실패 → [result] (error toast 표시)
    │
    ▼
[cards]
    │
    │  카드 클릭
    ▼
[cardDetail]
    │
    │  (추천 카드만) 사진 생성하기 → Gemini API 호출 → 스타일 적용 이미지 표시
    │
    │  ← 목록으로 → [cards]
    │
    └─ ← 처음으로 (카드 목록에서) → [upload] (전체 리셋)
```

---

## 화면별 상세

### 1. `[upload]` — 사진 업로드

**컴포넌트:** `PhotoUpload.jsx`

| 영역 | 내용 |
|------|------|
| 헤더 | "AI Beauty Coach / Find your Beauty." 브랜딩 |
| 정면 사진 | 클릭 / 드래그&드롭 업로드 (필수) |
| 측면 사진 | 토글 열면 90도·45도 슬롯 노출 (권장) |
| 촬영 가이드 | 버튼 → 바텀시트 팝업 (정면/측면 탭 전환, 이미지 확대 지원) |
| 퍼스널컬러 | "알아요 / 몰라요" 선택 (필수) |
| 분석 버튼 | 정면 사진 + 퍼스널컬러 선택 시에만 활성화 |

**유효성 검사 (validateImage.js)**
- 10KB 미만 파일 → 에러 메시지 인라인 표시
- 이미지 형식 아닌 파일 → 무시

**데이터 출력:** `(preview: base64, additionalImages: [], knowsColor: bool)` → `App.handleAnalyze()`

---

### 2. `[analyzing]` — 얼굴 분석 로딩

**컴포넌트:** `App.jsx` (인라인 렌더)

- 로딩 바 애니메이션 표시
- "얼굴을 분석하고 있어요" 문구
- 사용자 인터랙션 없음 (자동 전환)

**백그라운드 작업:** `claude.js → analyzeFace(imageBase64, additionalImages)`

---

### 3. `[result]` — 분석 결과 확인

**컴포넌트:** `AnalysisResult.jsx`

| 영역 | 내용 |
|------|------|
| 분석 사진 | 업로드한 정면 사진 표시 |
| Face Type | 얼굴형 이모지 + 이름 + 설명 |
| Personal Color | 퍼스널컬러를 "알아요" 한 경우에만 표시 — 4가지 중 선택 |
| Features | Claude가 감지한 이목구비 특징 태그 |
| 카드 선택 버튼 | 헤어 / 메이크업 / 종합 — 3가지 |

**버튼 활성 조건**

```
knowsPersonalColor === false  →  바로 활성 (색상 선택 불필요)
knowsPersonalColor === true   →  personalColor 선택 후 활성
```

**네비게이션**

| 액션 | 이동 |
|------|------|
| ← 다시 찍기 | [upload] + 전체 리셋 |
| 헤어/메이크업/종합 카드 받기 | [generatingCards] |

---

### 4. `[generatingCards]` — 카드 생성 로딩

**컴포넌트:** `App.jsx` (인라인 렌더)

- "코디 카드를 만들고 있어요" 문구
- 사용자 인터랙션 없음 (자동 전환)

**백그라운드 작업:** `ai.js → generateHairCards | generateMakeupCards | generateTotalCards`

RAG 데이터 주입 순서:
1. `hair-face-json.json` (얼굴형 매핑)
2. `makeup-json.json` (퍼스널컬러 매핑)
3. `featureTips-json.json` (이목구비 특징 매핑)
4. Claude 프롬프트에 합산 → 카드 4장 JSON 반환

---

### 5. `[cards]` — 코디 카드 목록

**컴포넌트:** `CardList.jsx`

| 영역 | 내용 |
|------|------|
| 헤더 | 얼굴형 · 퍼스널컬러 요약 |
| 섹션 구분 | 요청한 카드 타입(hair/makeup/total)만 렌더 |
| 추천 카드 3장 | Best / 2nd / 3rd 뱃지, 무드명, 스타일 프리뷰 |
| 비추천 카드 1장 | "Avoid" 영역 별도 구분, Worst 뱃지 |

**네비게이션**

| 액션 | 이동 |
|------|------|
| 카드 클릭 | [cardDetail] |
| ← 처음으로 | [upload] + 전체 리셋 |

---

### 6. `[cardDetail]` — 카드 상세 + 사진 생성

**컴포넌트:** `CardDetail.jsx`

**추천 카드 (type: recommend)**

| 영역 | 내용 |
|------|------|
| Hero | 이모지 + 무드명 + 랭크 뱃지 |
| Hair Style | 헤어 스타일명, 앞머리, 이유 |
| Makeup | Shading / Glow / Blush / Brow / Lip / Eye / Liner 항목별 표시 |
| Feature Tip | 이목구비 보정 팁 (있는 경우) |
| Coach Note | AI 코치 멘트 |
| 사진 생성 | "사진 생성하기" → Gemini API → 스타일 적용 이미지 표시 |

**비추천 카드 (type: avoid)**

- 위와 동일 구조이나 "Avoid" 테마 스타일 적용
- 사진 생성 섹션 미표시
- Coach Note → "Why Avoid" 레이블로 변경

**사진 생성 상태 흐름**

```
[미생성]
  사진 생성하기 버튼 클릭
    │
    ▼
[generating]  ← 스피너 + "Gemini AI가 스타일을 적용 중이에요"
    │
    ├─ 성공 → 생성된 이미지 표시 + "다시 생성하기" 버튼
    └─ 실패 → 에러 메시지 표시
```

**네비게이션**

| 액션 | 이동 |
|------|------|
| ← 목록으로 | [cards] |

---

## 에러 처리 요약

| 발생 위치 | 처리 방식 | 복구 경로 |
|-----------|-----------|-----------|
| 이미지 유효성 검사 | 인라인 에러 메시지 | 재선택 |
| analyzeFace 실패 | error toast + step 복구 | [upload]로 이동 |
| generateCards 실패 | error toast + step 복구 | [result]로 이동 |
| generateStyledPhoto 실패 | 카드 내 에러 메시지 | 재생성 가능 |

---

## 상태 변수 요약 (App.jsx)

| 변수 | 타입 | 설명 |
|------|------|------|
| `step` | string | 현재 화면 단계 |
| `image` | base64 string | 정면 사진 데이터 |
| `analysis` | object | Claude 분석 결과 |
| `cardSets` | `{ hair/makeup/total: Card[] }` | 생성된 카드 세트 |
| `selectedCard` | object | 상세 보기 중인 카드 |
| `knowsPersonalColor` | bool | 퍼스널컬러 인지 여부 |
| `error` | string | 전역 에러 메시지 |
