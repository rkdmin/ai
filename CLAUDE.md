# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ 문서 업데이트 규칙

> **기능이 변경될 때마다 아래 모든 MD 파일을 반드시 함께 수정하세요.**

| 파일 | 업데이트 시점 |
|------|-------------|
| `CLAUDE.md` (이 파일) | 구조·흐름·스키마·파일명 변경 시 |
| `src/data/ui-flow.md` | step 추가/삭제, 컴포넌트 동작·조건·state 변경 시 |
| `src/data/rag_usage_guide.md` | RAG 데이터 구조·병합 규칙·우선순위 변경 시 |

변경 후 MD와 코드가 불일치하면 다음 세션에서 잘못된 컨텍스트로 작업하게 됩니다.

---

## 💄 AI 뷰티 코치

사진 최대 3장(정면 1 + 측면 2)으로 얼굴형을 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장)과 전문가 피드백을 제공하는 AI 뷰티 코치 앱입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Vite |
| AI 분석 | Claude Vision API (`claude-sonnet-4-6`) |
| 이미지 생성 | Gemini (`gemini-2.5-flash-preview-image-generation`) |
| 조명 정규화 | Canvas API (브라우저 내 처리) |
| RAG 지식베이스 | JSON 파일 기반 |
| 배포 | Vercel |

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

### Claude Vision API 응답 스키마
```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형",
  "features": ["눈 간격 넓음", "광대 넓음"]
}
```
- `colorConfidence` 없음 — 퍼스널컬러는 별도 질문 흐름으로 확정
- `features`는 0~3개, 확신도 80% 미만이면 포함하지 않음

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
2. `analyzeFace(imageBase64, additionalImages)` → Claude Vision API → `{ faceType, features }` 반환
   - 측면 사진이 있으면 이미지 구성 컨텍스트를 프롬프트 앞에 자동 삽입
   - 거부 조건은 이미지 1(정면)에만 적용
3. `AnalysisResult` → 퍼스널컬러 확정 (알면 직접 선택 / 모르면 질문 3개)
4. `generateHairCards` / `generateMakeupCards` / `generateTotalCards` → RAG 컨텍스트 + 분석 결과 → 카드 4장 생성
5. 카드 선택 시 → `generateStyledPhoto(imageBase64, card)` → Gemini → 스타일 적용 이미지 반환
