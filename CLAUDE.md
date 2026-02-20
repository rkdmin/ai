# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 💄 AI 뷰티 코치

사진 1장으로 얼굴형 + 퍼스널컬러를 분석하고, 헤어/메이크업 코디 카드 3장과 전문가 피드백을 제공하는 AI 뷰티 코치 앱입니다.

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
│   ├── PhotoUpload.jsx  # 사진 업로드 + 조명 정규화 트리거
│   ├── AnalysisResult.jsx # 분석 결과 + 퍼스널컬러 선택 UI
│   ├── CardList.jsx     # 코디 카드 3장 목록
│   └── CardDetail.jsx   # 카드 상세 (피드백 + 적용 사진)
├── data/
│   ├── hairByFaceType.json   # 얼굴형별 헤어 추천 데이터
│   ├── makeupByColor.json    # 퍼스널컬러별 메이크업 추천 데이터
│   └── featureTips.json      # 이목구비별 보정 팁 데이터
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

**`hairByFaceType.json`**
```json
[{ "faceType": "둥근형", "recommend": ["레이어드컷"], "avoid": ["단발 원볼"], "reason": "세로 라인 강조" }]
```

**`makeupByColor.json`**
```json
[{ "personalColor": "여름쿨", "lip": ["로즈핑크"], "blush": ["베이비핑크"], "eyeshadow": ["그레이"], "avoid": ["오렌지"] }]
```

**`featureTips.json`**
```json
[{ "feature": "눈 간격 넓음", "makeupTip": "눈 앞머리를 진하게", "hairTip": "사이드파트 추천" }]
```

---

## 주요 데이터 흐름

1. `PhotoUpload` → `normalizeLight.js`로 화이트밸런스 보정 → base64 반환
2. base64 이미지 → `claude.js`로 전송 → 얼굴 분석 JSON 반환
3. 분석 결과 + RAG JSON → Claude에게 전달 → 코디 카드 3장 생성
4. 카드 선택 시 → `gemini.js`로 원본 사진 + 스타일 프롬프트 전송 → 적용 이미지 반환
