# TODO

## STEP 1 — 프로젝트 초기 세팅
`chore: init project`

- [x] Vite + React 프로젝트 생성
- [x] 불필요한 기본 파일 정리 (App.css 내용 비우기, App.jsx 초기화)
- [x] `src/api/`, `src/components/`, `src/data/`, `src/utils/` 폴더 생성
- [x] `.gitignore` 에 `.env` 추가 확인
- [x] `.env.example` 파일 생성

---

## STEP 2 — 조명 정규화 유틸 작성
~~`feat: lighting normalization`~~ → **생략**

---

## STEP 3 — 사진 업로드 UI
`feat: photo upload UI`

- [x] `src/components/PhotoUpload.jsx` 작성
  - 사진 업로드 버튼 (클릭 또는 드래그앤드롭)
  - 업로드 시 미리보기 표시
  - "분석 시작" 버튼
  - 팁 뱃지 (정면 사진, 자연광, 민낯 권장)

---

## STEP 4 — Claude Vision API 연동 (얼굴 분석)
`feat: claude vision API`

- [x] `src/api/claude.js` 작성
  - 보정된 이미지(base64)를 Claude Vision API에 전송 (claude-sonnet-4-6)
  - faceType / personalColor / colorConfidence / features JSON 반환
- [x] `src/components/AnalysisResult.jsx` 작성
  - 분석 결과 카드 (얼굴형, 퍼스널컬러, 이목구비 특징)
  - colorConfidence medium/low 시 퍼스널컬러 직접 선택 UI
- [x] 로딩 화면 + 에러 토스트 추가

---

## STEP 5 — RAG 데이터 JSON 작성
`feat: RAG data JSON`

- [x] `src/data/hair-face-json.json` 작성 (얼굴형 6종: oval/round/square/heart/long/diamond)
- [x] `src/data/makeup-json.json` 작성 (퍼스널컬러 4종: spring_warm/summer_cool/autumn_warm/winter_cool)
- [x] `src/data/featureTips-json.json` 작성 (이목구비 특징 19종)

---

## STEP 6 — 코디 카드 4장 UI + 피드백 생성
`feat: result card UI`
`feat: RAG feedback`

- [x] `src/api/claude.js`에 `generateCards()` 추가
  - RAG 데이터 조회 (얼굴형·퍼스널컬러·이목구비 매핑)
  - 추천 3장 + 비추천 1장 JSON 반환
- [x] `src/components/CardList.jsx` 작성
  - 추천 카드 3장 + 비추천 카드 1장 목록
  - 카드 클릭 시 상세 열기
- [x] `src/components/CardDetail.jsx` 작성
  - 헤어스타일 추천 + 이유
  - 메이크업 (립/블러셔/아이섀도우)
  - 전문가 코치 멘트
  - 적용 사진 플레이스홀더 (STEP 7에서 채움)

---

## STEP 7 — Gemini API 연동
`feat: gemini image API`

- [x] `src/api/gemini.js` 작성
  - 원본 사진 + 카드 스타일 프롬프트 → Gemini API 전달
  - 모델: `gemini-2.5-flash-preview-image-generation`
  - 생성된 이미지 base64 반환
- [x] CardDetail에 "사진 생성하기" 버튼 + 결과 이미지 표시
- [x] 생성 중 스피너, 에러 메시지, 다시 생성하기 버튼

---

## STEP 8 — 퍼스널컬러 보정 질문 흐름
`feat: personal color quiz`
- [ ] 답변 기반으로 퍼스널컬러 최종 확정 후 카드 생성

---

## STEP 9 — Vercel 배포
`chore: vercel deploy`

- [ ] vercel.com 접속 후 깃허브 레포 연결
- [ ] 환경변수 Vercel에 등록
- [ ] 배포 후 URL 확인
