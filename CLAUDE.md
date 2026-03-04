# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ 문서 업데이트 규칙

> **기능이 변경될 때마다 아래 모든 MD 파일을 반드시 함께 수정하세요.**

| 파일 | 업데이트 시점 |
|------|-------------|
| `CLAUDE.md` (이 파일) | 구조·흐름·스키마·파일명 변경 시 |
| `docs/ui-flow.md` | step 추가/삭제, 컴포넌트 동작·조건·state 변경 시 |
| `src/data/rag_usage_guide.md` | RAG 데이터 구조·병합 규칙·우선순위 변경 시 |

변경 후 MD와 코드가 불일치하면 다음 세션에서 잘못된 컨텍스트로 작업하게 됩니다.

---

## 💄 AI 뷰티 코치

사진 최대 3장(정면 1 + 측면 2)으로 얼굴형을 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장)과 전문가 피드백을 제공하는 AI 뷰티 코치 앱입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 (웹) | React + Vite |
| 앱 | React Native (Expo) |
| 얼굴 측정 | MediaPipe (Python, 백엔드) |
| AI 분석 + 카드 생성 | Gemini 2.5 Flash |
| 이미지 생성 | Gemini 2.5 Flash (이미지 생성 모드, 유료 전용) |
| RAG 지식베이스 | JSON 파일 기반 |
| 백엔드 | Python + FastAPI |
| DB / 인증 | Supabase |
| 배포 | Vercel (웹) / Railway (백엔드) |

---

## 개발 서버 실행

```bash
npm install
npm run dev
# → http://localhost:5173
```

환경변수 (`.env`):
```
VITE_ANTHROPIC_API_KEY=
VITE_GEMINI_API_KEY=
VITE_MOCK=true        # 토큰 소비 없이 UI 테스트 (선택)
```

---

## 프로젝트 구조

```
src/
├── api/
│   ├── ai.js           # 프로바이더 라우터 (claude / gemini / mock 분기)
│   ├── claude.js       # Claude Vision API 호출 (얼굴 분석 + 카드 생성)
│   ├── gemini.js       # Gemini API 호출 (스타일 적용 이미지 생성)
│   └── mock.js         # 더미 데이터 (VITE_MOCK=true 시 사용)
├── components/
│   ├── PhotoUpload.jsx    # 사진 업로드 (정면 필수 + 측면 90도·45도 선택)
│   ├── AnalysisResult.jsx # 분석 결과 + 퍼스널컬러 확정 UI
│   ├── CardList.jsx       # 코디 카드 4장 목록 (추천 3 + 비추천 1)
│   └── CardDetail.jsx     # 카드 상세 (피드백 + 적용 사진)
├── data/
│   ├── face-hair.json           # 얼굴형별 헤어 추천
│   ├── face-makeup.json         # 얼굴형별 메이크업 베이스 (위치/방법)
│   ├── personal-color-makeup.json  # 퍼스널컬러별 컬러 팔레트
│   ├── feature-tips.json        # 이목구비별 보정 팁
│   ├── 촬영가이드 여자.png        # 정면 촬영 가이드 이미지
│   ├── 촬영가이드 측면.png        # 측면 촬영 가이드 이미지 (90도·45도)
│   └── rag_usage_guide.md       # RAG 데이터 사용 가이드
└── utils/
    ├── ragUtils.js       # RAG 컨텍스트 빌더 + 카드 출력 포맷 + 프롬프트
    └── validateImage.js  # Canvas API 기반 이미지 유효성 검사
```

---

## 사진 업로드 구조

| 슬롯 | 필수 여부 | 설명 |
|------|----------|------|
| 정면 사진 | 필수 | 분석 기준 이미지 |
| 90도 측면 (프로필) | 권장 | 얼굴형 판단 보조 |
| 45도 반측면 | 권장 | 얼굴형 판단 보조 |

측면 사진은 토글로 접고 펼 수 있으며, 제출 시 아래 형태로 전달됩니다:
```js
additionalImages: { data: string /* base64 */, angle: string }[]
// 예: [{ data: '...', angle: '90도 측면 (프로필)' }, { data: '...', angle: '45도 반측면' }]
```

---

## 핵심 데이터 구조

### Gemini 분석 API 응답 스키마
```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형",
  "features": ["눈 간격 넓음", "광대 넓음"]
}
```

### 카드 공통 필드 (추가)
```json
{
  "styleLabel": "클래식 오벌 · 봄웜 비비드",
  "celebrityMatch": "아이유, 윈터 스타일과 유사합니다"
}
```
- `styleLabel`: 카드 목록 최상단 감성 레이블 (공유 이미지용), Gemini 생성

### 연예인 매칭 데이터 위치 (별도 필드 불필요)
- `face-hair.json[].exampleCelebrity` → 얼굴형별 연예인 목록 (이미 존재)
  - 예: oval → ["카리나", "윈터", "고윤정", "수지"]
- `face-makeup.json[].recommendCards[].title` → 카드 타이틀에 이미 포함
  - 예: "우아한 분위기 룩 (탕웨이 st)", "시크 도회적 룩 (김지원 st)"
- → RAG에서 그대로 가져와 UI에 표시, Gemini 추가 호출 불필요
- MediaPipe 수치(이마/광대/턱 비율, 얼굴길이/폭, 턱 각도)를 함께 전달하여 정확도 향상
- `features`는 0~3개, 확신도 80% 미만이면 포함하지 않음
- 퍼스널컬러는 별도 질문 흐름으로 확정

### RAG JSON 파일 역할

| 파일 | 역할 | 키 구조 |
|------|------|---------|
| `face-hair.json` | 얼굴형별 헤어 추천 | `hairByFaceType[].faceType` (oval/round/square/heart/long/diamond/peanut) |
| `face-makeup.json` | 메이크업 위치·방법 베이스 | `makeupByFaceShape[].faceType` |
| `personal-color-makeup.json` | 컬러 팔레트 레이어 | `makeupByPersonalColor[].personalColor` (spring_warm/summer_cool/autumn_warm/winter_cool) |
| `feature-tips.json` | 이목구비 보정 팁 (최우선) | `featureTips[].label` (한국어 매칭) |

### 한국어 → 영문 키 매핑 (`ragUtils.js` 내 상수)
- 얼굴형: `계란형→oval`, `둥근형→round`, `사각형→square`, `하트형→heart`, `긴형→long`, `다이아몬드형→diamond`, `땅콩형→peanut`
- 퍼스널컬러: `봄웜→spring_warm`, `여름쿨→summer_cool`, `가을웜→autumn_warm`, `겨울쿨→winter_cool`

---

## 주요 데이터 흐름

1. `PhotoUpload` → 정면 + 측면 사진(선택) 수집
2. 백엔드 `/api/analyze` 호출
   - MediaPipe (Python) → 얼굴 랜드마크 수치 추출
   - Gemini 2.5 Flash → 수치 + 이미지 → `{ faceType, features }` 반환
   - 측면 사진은 Gemini에게 보조 분석용으로 전달
3. `AnalysisResult` → 퍼스널컬러 확정 (알면 직접 선택 / 모르면 질문 3개)
4. `generateHairCards` / `generateMakeupCards` / `generateTotalCards` → RAG 컨텍스트 + 분석 결과 → Gemini → 카드 4장 생성
5. 카드 선택 시 → `generateStyledPhoto(imageBase64, card)` → Gemini (이미지 생성 모드, 유료) → 스타일 적용 이미지 반환
