# UI Flow

> **기능이 변경될 때마다 이 파일을 반드시 함께 수정하세요.**
> 수정 대상 목록 → `CLAUDE.md` 상단 "문서 업데이트 규칙" 참고

---

## 앱 탭 구조

하단 탭바 3개 (항상 표시):

```
[홈] [트렌드] [히스토리]
```

- **홈 탭**: 얼굴 분석 → 카드 추천 메인 플로우
- **트렌드 탭**: 주간 뷰티 트렌드 피드 (얼굴형/퍼컬 필터)
- **히스토리 탭**: 최근 분석 기록 5회 (로그인 필요)

---

## 전체 흐름 개요

```
[홈 탭] upload → analyzing → result → generatingCards → cards → cardDetail
[트렌드 탭] 트렌드 피드 (독립)
[히스토리 탭] 히스토리 목록 → 히스토리 상세
```

뒤로가기:
- `result`  → "← 다시 찍기" → `upload`
- `cards`   → "← 처음으로" → `upload` (전체 리셋)
- `cardDetail` → "← 목록으로" → `cards`

에러 발생 시:
- `analyzing` 실패 → `upload`로 복귀 + 에러 토스트
- `generatingCards` 실패 → `result`로 복귀 + 에러 토스트

---

## Step 1 — PhotoUpload (`step: 'upload'`)

**컴포넌트:** `PhotoUpload.jsx`

### 정면 사진 (필수)
- 클릭 또는 드래그로 업로드
- 업로드 즉시 `validateImage()` 로 Canvas 기반 유효성 검사
  - 해상도 80px 미만 → 거부
  - 평균 밝기 40 미만 (너무 어두움) → 거부
  - 평균 밝기 230 초과 (과노출) → 거부
  - 표준편차 15 미만 (단색·형체 없음) → 거부
- 통과 시 미리보기 표시 / 실패 시 에러 메시지 + 재업로드 유도
- 미리보기 상태에서 "다른 사진 선택하기" 버튼으로 리셋 가능

### 측면 사진 (권장, 토글)
- 헤더 클릭으로 접기/펼치기 (기본: 닫힘)
- "두 앵글 모두 제출하면 얼굴형 분석 정확도가 높아집니다" 문구는 항상 표시
- 슬롯 2개가 나란히 표시됨:
  - **90도 측면 (프로필)** — 완전히 옆으로
  - **45도 반측면** — 45도 대각선
- 각 슬롯 독립적으로 업로드/삭제/에러 처리
- 업로드 시 동일하게 `validateImage()` 통과 필요

### 촬영 가이드 시트
- "촬영가이드 확인하기" 버튼 → 바텀 시트 표시
- 정면/측면 탭으로 가이드 이미지 전환
  - 정면 탭: `촬영가이드 여자.png`
  - 측면 탭: `촬영가이드 측면.png` (90도·45도 두 앵글)
- 이미지 꾹 누르기 → 전체화면 확대 오버레이
- 가이드 내용: 공통 조건 / 정면 자세 / 측면 자세 3섹션

### 퍼스널컬러 질문
- "알아요" / "몰라요" 중 하나 선택 (필수)
- 선택 전까지 "분석 시작하기" 버튼 비활성화

### 분석 시작 조건
- 정면 사진 업로드 완료 **AND** 퍼스널컬러 질문 응답 완료
- 버튼 클릭 → `onAnalyze(preview, additionalImages, knowsColor)` 호출
  - `additionalImages`: `{ data: base64, angle: string }[]` (없으면 빈 배열)

---

## Step 2 — 분석 로딩 (`step: 'analyzing'`)

**컴포넌트:** `App.jsx` 내 인라인 로딩 화면

- "Beauté AI" 엠블럼 + 바 애니메이션 표시
- "얼굴을 분석하고 있어요 / 잠시만 기다려주세요..."
- 내부 동작: `analyzeFace(imageBase64, additionalImages)` 호출
  - 측면 사진이 있으면 이미지 구성 컨텍스트를 프롬프트 앞에 삽입
  - Claude가 정면 기준 분석, 측면은 얼굴형 보조 판단
- 성공 → `result`로 이동
- 실패 → `upload`로 복귀 + 에러 토스트

---

## Step 3 — 분석 결과 (`step: 'result'`)

**컴포넌트:** `AnalysisResult.jsx`

### 표시 내용
| 섹션 | 조건 | 내용 |
|------|------|------|
| 정면 사진 | 항상 | 업로드한 정면 사진 |
| Face Type | 항상 | 얼굴형명 + 이모지 + 한줄 설명 |
| Personal Color | `knowsPersonalColor === true` | 봄웜/여름쿨/가을웜/겨울쿨 선택 버튼 |
| Features | `analysis.features.length > 0` | 이목구비 특징 태그 목록 |

### 퍼스널컬러 처리
- `knowsPersonalColor === true`: 4개 버튼 중 선택 필수 → 선택 전까지 카드 버튼 비활성화
- `knowsPersonalColor === false`: 선택 UI 없음, 카드 버튼 바로 활성화 (퍼스널컬러 `null`로 전달)

### 카드 타입 선택
- **헤어 카드 받기** → `generateHairCards(analysis)`
- **메이크업 카드 받기** → `generateMakeupCards(analysis)`
- **종합 카드 받기** → `generateTotalCards(analysis)`
- 선택 시 `generatingCards` 로딩으로 이동

---

## Step 4 — 카드 생성 로딩 (`step: 'generatingCards'`)

**컴포넌트:** `App.jsx` 내 인라인 로딩 화면

- "코디 카드를 만들고 있어요 / 잠시만 기다려주세요..."
- 성공 → `cards`로 이동
- 실패 → `result`로 복귀 + 에러 토스트

---

## Step 5 — 카드 목록 (`step: 'cards'`)

**컴포넌트:** `CardList.jsx`

- sticky 상단 바: "Style Cards" 타이틀만 표시
- 상단 바 아래 `cards-header-info` 블록 (항상 표시):
  - eyebrow: "YOUR ANALYSIS"
  - 타이틀: `{faceType} · {personalColor}`
  - personalColor가 null이면 faceType만 표시
- **감성 레이블 블록** (카드 목록 최상단, 헤더 바로 아래):
  - 카드 데이터의 `styleLabel` 필드 표시
  - 예: "클래식 오벌 · 봄웜 비비드" — 공유 욕구 자극용 감성 네이밍
  - 공유 버튼 옆에 배치
- **결과 카드 공유 버튼**:
  - `react-native-view-shot`으로 감성 레이블 + 분석 결과 캡처
  - 인스타그램 스토리 / 카카오톡 / 이미지 저장 공유
- 선택한 카드 타입의 섹션만 렌더링 (hair / makeup / total)
- **카드 잠금 구조**:
  - Rank 3 (3rd) → 무료 공개
  - Rank 1 (Best) → 🔒 블러 처리 + "광고 보고 확인하기"
  - Rank 2 (2nd) → 🔒 블러 처리 + "광고 보고 확인하기"
  - Avoid 카드 → 무료 공개
  - 유료 구독자 → 전체 잠금 해제
- 광고 시청 완료 → 해당 rank 카드 세션 내 해금
- 카드 클릭 → `cardDetail`로 이동

---

## Step 6 — 카드 상세 (`step: 'cardDetail'`)

**컴포넌트:** `CardDetail.jsx`

### 추천 카드
| 섹션 | 조건 | 내용 |
|------|------|------|
| Hero | 항상 | 이모지 + rank 배지 (Best Pick / 2nd Pick) + 무드명 |
| Hair Style | `card.hair` 있을 때 | 헤어스타일명 + 앞머리 + 이유 |
| Makeup | `card.makeup` 있을 때 | Shading / Glow / Blush / Brow / Lip / Eye / Liner 항목별 이름 + 이유 |
| Feature Tip | `card.featureTip` 있을 때 | 이목구비 보정 팁 |
| Coach Note | 항상 | 전문가 코멘트 |
| 적용 사진 | 추천 카드만 | 아래 참고 |

### Avoid 카드
- rank 배지 대신 "Avoid" 배지
- "적용 사진" 섹션 없음
- Coach Note → "Why Avoid"로 레이블 변경

### 적용 사진 생성 + 전후 비교 (추천 카드만, 유료)
1. "이 스타일을 내 얼굴에 적용해볼까요?" + "사진 생성하기" 버튼 표시
2. 유료 플랜 아닌 경우 → 구독 유도 모달
3. 버튼 클릭 → `generateStyledPhoto(image, card)` 호출 (Gemini API)
4. 생성 중: 스피너 + "사진을 생성하고 있어요..."
5. 성공:
   - **전후 비교 토글 UI** 표시
   - [전] 탭: 원본 업로드 사진
   - [후] 탭: Gemini 적용 사진
   - 탭 전환 시 슬라이드 애니메이션
   - "다시 생성하기" 버튼
6. 실패: 에러 메시지 표시

---

---

## 트렌드 탭 (`tab: 'trends'`)

**컴포넌트:** `TrendsScreen`

- 주 1회 업데이트 (백엔드 cron 수집)
- 내 얼굴형 · 퍼스널컬러 태그와 일치하는 기사만 필터링
- 분석 기록 없는 경우 전체 트렌드 표시
- 카드 형태: 기사 제목 + 요약 (Gemini 생성) + 원문 링크
- 배너 광고: 피드 3번째 카드 사이에 삽입

---

## 히스토리 탭 (`tab: 'history'`)

**컴포넌트:** `HistoryScreen`

- 로그인 필요: 비로그인 시 로그인 유도 화면 표시
- 최근 5회 분석 기록 목록
  - 날짜 / 얼굴형 / 퍼스널컬러 / 생성한 카드 타입
- 항목 탭 → 당시 카드 목록(`cards`)으로 이동
- 사진 만료(30일) 시 "사진이 만료되었습니다" 표시

---

## State 구조 (`App.jsx`)

```js
step: 'upload' | 'analyzing' | 'result' | 'generatingCards' | 'cards' | 'cardDetail'
image: string | null           // 정면 사진 base64
analysis: { faceType, features, personalColor? } | null
cardSets: { hair?, makeup?, total? } | null
selectedCard: CardObject | null
knowsPersonalColor: boolean | null
error: string | null           // 에러 토스트 메시지
```
