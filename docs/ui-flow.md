# UI Flow

> **기능이 변경될 때마다 이 파일을 반드시 함께 수정하세요.**
> 수정 대상 목록 → `AGENTS.md` 상단 "문서 업데이트 규칙" 참고

---

## 앱 탭 구조

하단 탭바 3개:

```
[홈] [트렌드] [히스토리]
```

- **홈 탭**: 얼굴 분석 → 카드 추천 메인 플로우
- **트렌드 탭**: 주간 뷰티 트렌드 피드
- **히스토리 탭**: 최근 분석 기록 5회
- 웹과 Capacitor 앱이 동일한 UI 흐름을 공유

---

## 전체 흐름 개요

```
[홈 탭] upload → analyzing → result → generatingCards → cards → cardDetail
[트렌드 탭] 트렌드 피드
[히스토리 탭] 히스토리 목록 → 히스토리 상세
```

뒤로가기:
- `result` → `upload`
- `cards` → `upload` (전체 리셋)
- `cardDetail` → `cards`

에러 발생 시:
- `analyzing` 실패 → `upload` + 에러 안내
- `generatingCards` 실패 → `result` + 에러 안내

---

## Step 1 — PhotoUpload (`step: 'upload'`)

**컴포넌트:** `PhotoUpload.jsx`

### 정면 사진 (필수)

- 클릭 또는 드래그 업로드
- 업로드 즉시 `validateImage()`로 유효성 검사
- 통과 시 미리보기 표시
- 실패 시 에러 메시지 + 재업로드 유도

### 측면 사진 (권장, 토글)

- 정면 사진 업로드 후 자동 펼침
- 슬롯 2개:
  - `90도 측면 (프로필)`
  - `45도 반측면`
- 각 슬롯 독립 업로드/삭제/에러 처리

### 촬영 가이드 시트

- `"촬영가이드 확인하기"` 버튼
- 정면/측면 탭 전환
- 가이드 이미지를 전체화면으로 확대 가능

### 퍼스널컬러 질문

- `"알아요"` / `"몰라요"` 중 하나 선택
- 선택 전까지 분석 CTA 비활성화

### 분석 시작 조건

- 정면 사진 업로드 완료
- 퍼스널컬러 질문 응답 완료
- `onAnalyze(preview, additionalImages, knowsColor)` 호출

---

## Step 2 — 분석 로딩 (`step: 'analyzing'`)

**컴포넌트:** `App.jsx` 내 인라인 로딩 화면

- "Beauté AI" 로딩 화면
- 2단계 진행 표시
  - Step 1: MediaPipe 측정
  - Step 2: Gemini 분석
- 내부 동작: `analyzeFace(imageBase64, additionalImages)`
- 성공 → `result`
- 실패 → `upload`

---

## Step 3 — 분석 결과 (`step: 'result'`)

**컴포넌트:** `AnalysisResult.jsx`

### 표시 내용

| 섹션 | 조건 | 내용 |
|------|------|------|
| 정면 사진 | 항상 | 업로드한 사진 |
| Face Type | 항상 | 얼굴형 + 설명 |
| Personal Color | `knowsPersonalColor === true` | 4개 버튼 중 선택 |
| Features | `analysis.features.length > 0` | 특징 태그 |

### 카드 타입 선택

- 헤어 카드
- 메이크업 카드
- 종합 카드
- 선택 시 `generatingCards` 이동

---

## Step 4 — 카드 생성 로딩 (`step: 'generatingCards'`)

**컴포넌트:** `App.jsx` 내 인라인 로딩 화면

- `"코디 카드를 만들고 있어요"`
- 성공 → `cards`
- 실패 → `result`

---

## Step 5 — 카드 목록 (`step: 'cards'`)

**컴포넌트:** `CardList.jsx`

- 상단 분석 요약 표시
- `styleLabel` 감성 레이블 표시
- 선택한 카드 타입의 카드 4장 렌더링

### 공유

- 결과 카드 공유 버튼 제공
- 구현 방식:
  - 웹: `html2canvas`로 캡처 후 다운로드/공유
  - 앱: `html2canvas` + `@capacitor/share`

### 카드 잠금 구조

- Rank 3 → 무료
- Rank 1 / 2 → 잠금 + 광고 시청 후 해제
- Avoid 카드 → 무료

---

## Step 6 — 카드 상세 (`step: 'cardDetail'`)

**컴포넌트:** `CardDetail.jsx`

### 추천 카드

- Hero
- Hair Style
- Makeup
- Feature Tip
- Coach Note
- 적용 사진 (헤어/종합 추천 카드만)
- 추천 제품 (메이크업 카드만)

### 메이크업 카드 상세

1. 카드 하단에 추천 제품 블록 노출
2. 상품 수는 2~4개를 기본으로 하며 `label`과 `"쿠팡에서 보기"` CTA를 표시
3. CTA 클릭 시 `coupangPartnersUrl`로 이동
4. 하단에 쿠팡파트너스 법적 고지 문구를 함께 노출
5. 메이크업 카드에서는 `"사진 생성하기"` 버튼을 노출하지 않음

### 헤어/종합 카드 적용 사진 생성

1. `"사진 생성하기"` 버튼
2. 로그인 사용자이며 생성 가능 횟수가 남아 있으면 `generateStyledPhoto(image, card)` 호출
3. 게스트이거나 일일 제한 초과 시 안내 UI 노출
4. 성공 시 전후 비교 토글 노출

---

## 트렌드 탭 (`tab: 'trends'`)

**컴포넌트:** `TrendsScreen`

- 주 1회 업데이트
- 얼굴형 / 퍼스널컬러 기반 필터
- 기사 제목 + 요약 + 원문 링크

---

## 히스토리 탭 (`tab: 'history'`)

**컴포넌트:** `HistoryScreen`

- 로그인 필요
- 최근 5회 분석 기록
- 항목 선택 시 당시 카드 목록 재표시

---

## State 구조 (`App.jsx`)

```js
step: 'upload' | 'analyzing' | 'result' | 'generatingCards' | 'cards' | 'cardDetail'
image: string | null
analysis: { faceType, features, personalColor? } | null
cardSets: { hair?, makeup?, total? } | null
selectedCard: CardObject | null // makeup card는 recommendedProducts[] 포함 가능
knowsPersonalColor: boolean | null
error: string | null
```
