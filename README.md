# Beauté AI — AI 뷰티 코치

사진 1장으로 얼굴형을 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장)과 전문가 피드백을 제공하는 AI 뷰티 코치 웹 앱입니다.

---

## 기능 요약

| 기능 | 설명 |
|------|------|
| 사진 업로드 | 클릭 또는 드래그앤드롭, 이미지 유효성 검사, 촬영 가이드 제공 |
| 얼굴 분석 | Claude Vision / Gemini Vision으로 얼굴형 · 이목구비 특징 추출 |
| 코디 카드 생성 | RAG 지식베이스 기반 헤어/메이크업/종합 코디 카드 4장 생성 |
| 스타일 사진 생성 | Gemini 이미지 생성 모델로 스타일 적용 사진 반환 |
| AI 프로바이더 전환 | Claude / Gemini / Mock 환경변수 한 줄로 전환 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19 + Vite 6 |
| 얼굴 분석 (기본) | Claude Vision API (`claude-sonnet-4-6`) |
| 얼굴 분석 (대체) | Gemini Vision (`gemini-2.5-flash`) |
| 이미지 생성 | Gemini (`gemini-2.5-flash-preview-image-generation`) |
| RAG 지식베이스 | 로컬 JSON 파일 (얼굴형별 헤어, 얼굴형별 메이크업, 퍼스널컬러별 메이크업, 이목구비 팁) |
| 배포 | Vercel |

---

## 빠른 시작

```bash
npm install
npm run dev
# → http://localhost:5173
```

### 환경 변수 (`.env`)

```env
VITE_ANTHROPIC_API_KEY=sk-ant-...   # Claude API 키
VITE_GEMINI_API_KEY=AIza...         # Gemini API 키

# 선택 사항
VITE_AI_PROVIDER=gemini             # 생략 시 Claude 사용
VITE_MOCK=true                      # 더미 데이터로 실행 (API 호출 없음)
```

> `.env.example` 참고

---

## 프로젝트 구조

```
src/
├── api/
│   ├── ai.js          # AI 프로바이더 라우터 (Claude | Gemini | Mock)
│   ├── claude.js      # Claude Vision API — 얼굴 분석 + 카드 생성
│   ├── gemini.js      # Gemini API — 얼굴 분석 + 카드 생성 + 스타일 사진 생성
│   └── mock.js        # 더미 데이터 (개발/테스트용)
├── components/
│   ├── PhotoUpload.jsx    # 사진 업로드 + 촬영 가이드 + 퍼스널컬러 사전 질문
│   ├── AnalysisResult.jsx # 얼굴 분석 결과 확인 + 퍼스널컬러 선택 + 카드 타입 선택
│   ├── CardList.jsx       # 코디 카드 4장 목록 (추천 3 + 비추천 1)
│   └── CardDetail.jsx     # 카드 상세 + 스타일 적용 사진 생성
├── data/
│   ├── face-hair.json             # 얼굴형별 헤어 추천 (7종: oval/round/square/heart/long/diamond/peanut)
│   ├── face-makeup.json           # 얼굴형별 메이크업 추천 (위치·방법 레이어)
│   ├── personal-color-makeup.json # 퍼스널컬러별 메이크업 (컬러 레이어, 4종)
│   └── feature-tips.json          # 이목구비 특징별 보정 팁 (헤어 + 메이크업)
└── utils/
    ├── ragUtils.js       # RAG 컨텍스트 빌더 + 카드 출력 포맷 + 분석 프롬프트
    └── validateImage.js  # 업로드 이미지 유효성 검사
```

---

## 데이터 흐름

```
사진 업로드
    │
    ▼
validateImage (해상도·비율 검사)
    │
    ▼
analyzeFace — Claude Vision / Gemini Vision
    │  얼굴형(faceType) + 이목구비 특징(features) 반환
    ▼
AnalysisResult — 사용자가 퍼스널컬러 선택 + 카드 타입 선택
(헤어 / 메이크업 / 종합)
    │
    ▼
RAG 컨텍스트 빌드 (ragUtils.js)
  face-hair.json + face-makeup.json
  + personal-color-makeup.json + feature-tips.json
    │
    ▼
generateCards — Claude / Gemini
    │  코디 카드 4장 JSON 반환
    ▼
CardList — 카드 목록 표시
    │
    ▼
CardDetail — 카드 상세 + "사진 생성하기"
    │
    ▼
generateStyledPhoto — Gemini Image Generation
    스타일 적용 사진 base64 반환
```

---

## RAG 아키텍처

카드 생성은 3개의 JSON 레이어를 병합해 프롬프트를 구성합니다.

### 헤어 카드 컨텍스트
- `face-hair.json`: 얼굴형별 추천 헤어 (우선순위·이유·앞머리 유형 포함)
- `feature-tips.json`: 이목구비 특징별 헤어 팁 (최우선 적용)

### 메이크업 카드 컨텍스트
- `face-makeup.json`: 얼굴형별 메이크업 위치·방법 레이어
- `personal-color-makeup.json`: 퍼스널컬러별 메이크업 컬러 레이어
- `feature-tips.json`: 이목구비 특징별 메이크업 팁 (최우선 적용)
- 병합 우선순위: **featureTip > personalColor > faceMakeup**

### 종합 카드 컨텍스트
- 메이크업 컨텍스트 + 헤어 컨텍스트 통합

---

## API 핵심 스키마

### 얼굴 분석 응답
```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형",
  "features": ["눈 간격 넓음", "광대 넓음"]
}
```

### 코디 카드 (추천)
```json
{
  "type": "recommend",
  "rank": 1,
  "cardType": "hair | makeup | total",
  "mood": "스타일 무드명",
  "emoji": "✨",
  "hair": "헤어스타일명",
  "bangs": "앞머리 스타일",
  "hairReason": "왜 어울리는지 1문장",
  "makeup": { "lip": "...", "blush": "...", "eyeshadow": "...", "..." },
  "featureTip": "이목구비 팁 1문장",
  "coachComment": "전체 조언 2-3문장"
}
```

### 코디 카드 (비추천)
```json
{
  "type": "avoid",
  "cardType": "hair | makeup | total",
  "mood": "피해야 할 스타일",
  "emoji": "⚠️",
  "coachComment": "왜 맞지 않는지 2-3문장"
}
```

---

## AI 프로바이더 전환

`src/api/ai.js`가 환경변수에 따라 프로바이더를 자동 선택합니다.

| `VITE_MOCK` | `VITE_AI_PROVIDER` | 동작 |
|-------------|-------------------|------|
| `true` | (무관) | Mock 더미 데이터 반환 |
| - | `gemini` | Gemini Vision + Gemini Card 생성 |
| - | (생략) | Claude Vision + Claude Card 생성 |

스타일 적용 사진 생성은 Mock 모드를 제외하고 항상 Gemini 이미지 생성 모델을 사용합니다.

---

## 앱 상태 흐름

```
upload
  → analyzing        (얼굴 분석 중)
  → result           (분석 결과 + 카드 타입 선택)
  → generatingCards  (카드 생성 중)
  → cards            (카드 목록)
  → cardDetail       (카드 상세 + 사진 생성)
```

---

## 개발 현황

| 단계 | 상태 | 내용 |
|------|------|------|
| 프로젝트 초기 세팅 | ✅ 완료 | Vite + React, 폴더 구조, .env |
| 사진 업로드 UI | ✅ 완료 | 드래그앤드롭, 미리보기, 촬영 가이드, 유효성 검사 |
| 얼굴 분석 API | ✅ 완료 | Claude Vision / Gemini Vision, 에러 처리 |
| RAG 데이터 JSON | ✅ 완료 | 얼굴형 7종, 퍼스널컬러 4종, 이목구비 팁 |
| 코디 카드 생성 | ✅ 완료 | 헤어/메이크업/종합 카드 4장, RAG 컨텍스트 병합 |
| 스타일 사진 생성 | ✅ 완료 | Gemini 이미지 생성, 스피너, 에러 처리 |
| AI 프로바이더 라우터 | ✅ 완료 | Claude / Gemini / Mock 전환 |
| 퍼스널컬러 보정 질문 | 🔲 미완 | 답변 기반 퍼스널컬러 확정 로직 |
| Vercel 배포 | 🔲 미완 | 환경변수 등록 후 배포 |

---

## 배포 (Vercel)

1. Vercel 대시보드에서 GitHub 레포 연결
2. 환경변수 등록: `VITE_ANTHROPIC_API_KEY`, `VITE_GEMINI_API_KEY`
3. 빌드 커맨드: `npm run build`, 출력 디렉터리: `dist`
