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
`feat: lighting normalization`

- [ ] `src/utils/normalizeLight.js` 작성
  - 사진을 Canvas에 그린 뒤 픽셀 데이터를 읽어서 화이트밸런스 보정
  - 보정된 이미지를 base64로 반환
  - 핵심 로직: 이미지의 가장 밝은 영역을 기준으로 R/G/B 채널 값을 정규화

---

## STEP 3 — 사진 업로드 UI
`feat: photo upload UI`

- [ ] `src/components/PhotoUpload.jsx` 작성
  - 사진 업로드 버튼 (클릭 또는 드래그앤드롭)
  - 업로드 시 조명 정규화 자동 실행 (`normalizeLight.js` 호출)
  - 원본 사진 / 보정된 사진 미리보기 나란히 표시
  - "분석 시작" 버튼
  - 가이드 예시 사진 표시 (정면, 자연광 권장 안내)

---

## STEP 4 — Claude Vision API 연동 (얼굴 분석)
`feat: claude vision API`

- [ ] `src/api/claude.js` 작성
  - 보정된 이미지(base64)를 Claude Vision API에 전송
  - 아래 정보를 JSON으로 반환받도록 프롬프트 작성
    - `faceType`: 얼굴형 (계란형 / 둥근형 / 사각형 / 하트형 / 긴형)
    - `personalColor`: 퍼스널컬러 (봄웜 / 여름쿨 / 가을웜 / 겨울쿨)
    - `colorConfidence`: 퍼스널컬러 확신도 (high / medium / low)
    - `features`: 이목구비 특징 배열 (예: ["눈 간격 넓음", "턱선 각짐"])
- [ ] `src/components/AnalysisResult.jsx` 작성
  - 분석 결과 카드 표시
  - 확신도가 medium/low일 경우 퍼스널컬러 선택 UI 표시

---

## STEP 5 — RAG 데이터 JSON 작성
`feat: RAG data JSON`

- [ ] `src/data/hairByFaceType.json` 작성
- [ ] `src/data/makeupByColor.json` 작성
- [ ] `src/data/featureTips.json` 작성

---

## STEP 6 — 코디 카드 3장 UI + 피드백 생성
`feat: result card UI`
`feat: RAG feedback`

- [ ] `src/components/CardList.jsx` 작성
  - 카드 3장 나열 (잠긴 상태, 제목/무드만 표시)
  - 카드 클릭 시 상세 열기
- [ ] 카드 3장 내용 생성 로직
  - 분석 결과 + JSON 데이터를 합쳐서 Claude에게 전달
  - 카드 3장 내용 반환 (헤어 추천, 메이크업 포인트, 한줄 코치 멘트)
- [ ] `src/components/CardDetail.jsx` 작성
  - 헤어스타일 추천
  - 메이크업 포인트 2~3가지
  - RAG 기반 코치 멘트
  - 적용 사진 영역 (STEP 7에서 채움)

---

## STEP 7 — Gemini API 연동
`feat: gemini image API`

- [ ] `src/api/gemini.js` 작성
  - 원본 사진 + 스타일 프롬프트를 Gemini API에 전달
  - 모델: `gemini-2.5-flash-preview-image-generation`
  - 생성된 이미지 URL 반환
- [ ] CardDetail에 적용 사진 표시

---

## STEP 8 — 퍼스널컬러 보정 질문 흐름
`feat: personal color quiz`

- [ ] 확신도가 medium/low일 때 질문 3개 표시
  - "햇빛 아래 피부가 황금빛인가요, 분홍빛인가요?"
  - "금 귀걸이 vs 은 귀걸이 어느 쪽이 더 잘 어울렸나요?"
  - "흰색 vs 아이보리 중 더 잘 어울리는 색은?"
- [ ] 답변 기반으로 퍼스널컬러 최종 확정 후 카드 생성

---

## STEP 9 — Vercel 배포
`chore: vercel deploy`

- [ ] vercel.com 접속 후 깃허브 레포 연결
- [ ] 환경변수 Vercel에 등록
- [ ] 배포 후 URL 확인
