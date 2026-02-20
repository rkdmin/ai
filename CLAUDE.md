# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 💄 AI 뷰티 코치

사진 1장으로 얼굴형 + 퍼스널컬러를 분석하고, 헤어/메이크업 코디 카드 4장(추천 3장 + 비추천 1장)과 전문가 피드백을 제공하는 AI 뷰티 코치 앱입니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Vite |
| AI 분석 | Claude Vision API (Anthropic) |
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
```

---

## 프로젝트 구조

```
src/
├── api/
│   ├── claude.js       # Claude Vision API 호출 (얼굴 분석)
│   └── gemini.js       # Gemini API 호출 (스타일 적용 이미지 생성)
├── components/
│   ├── PhotoUpload.jsx    # 사진 업로드 + 조명 정규화 트리거
│   ├── AnalysisResult.jsx # 분석 결과 + 퍼스널컬러 선택 UI
│   ├── CardList.jsx       # 코디 카드 4장 목록 (추천 3 + 비추천 1)
│   └── CardDetail.jsx     # 카드 상세 (피드백 + 적용 사진)
├── data/
│   ├── hair-face-json.json    # 얼굴형별 헤어 추천 (key: oval/round/square/heart/long/diamond)
│   ├── makeup-json.json       # 퍼스널컬러별 메이크업 추천 (key: spring_warm/summer_cool/autumn_warm/winter_cool)
│   └── featureTips-json.json  # 이목구비별 보정 팁 (key: wide_eye_spacing 등 영문 snake_case)
└── utils/
    └── normalizeLight.js     # Canvas API 화이트밸런스 보정 → base64 반환
```

---

## 핵심 데이터 구조

### Claude Vision API 응답 스키마
```json
{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형",
  "personalColor": "봄웜 | 여름쿨 | 가을웜 | 겨울쿨",
  "colorConfidence": "high | medium | low",
  "features": ["눈 간격 넓음", "턱선 각짐"]
}
```
`colorConfidence`가 `medium` / `low`이면 퍼스널컬러 보정 질문 3개를 표시하고 최종 확정 후 카드를 생성한다.

### RAG JSON 형식

**`hair-face-json.json`** — `hairData.hairByFaceType[]`
```json
{ "faceType": "round", "recommend": [{"style":"...", "reason":"...", "promptKeyword":"...", "priority":1}], "avoid": [{"style":"...", "reason":"..."}], "coachComment": "..." }
```

**`makeup-json.json`** — `makeupData.makeupByPersonalColor[]`
```json
{ "personalColor": "summer_cool", "lip": [{"style":"...", "reason":"...", "promptKeyword":"...", "priority":1}], "blush":[...], "eyeshadow":[...], "avoid":[...], "coachComment":"..." }
```

**`featureTips-json.json`** — `featureTipsData.featureTips[]`
```json
{ "feature": "wide_eye_spacing", "label": "눈 간격 넓음", "makeupTip": "...", "hairTip": "..." }
```

**한국어 → 영문 키 매핑** (claude.js 내 상수):
- 얼굴형: `계란형→oval`, `둥근형→round`, `사각형→square`, `하트형→heart`, `긴형→long`
- 퍼스널컬러: `봄웜→spring_warm`, `여름쿨→summer_cool`, `가을웜→autumn_warm`, `겨울쿨→winter_cool`

---

## 주요 데이터 흐름

1. `PhotoUpload` → `normalizeLight.js`로 화이트밸런스 보정 → base64 반환
2. base64 이미지 → `claude.js`로 전송 → 얼굴 분석 JSON 반환
3. 분석 결과 + RAG JSON → Claude에게 전달 → 코디 카드 4장 생성 (추천 3 + 비추천 1)
4. 카드 선택 시 → `gemini.js`로 원본 사진 + 스타일 프롬프트 전송 → 적용 이미지 반환
