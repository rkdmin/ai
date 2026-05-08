---
name: eval-face
description: 골든셋 사진들에 backend ANALYZE_PROMPT 를 돌려 얼굴형 판정 결과를 수집·비교한다. Gemini API 비용 없이 Claude 정액제 쿼터로 동작. 사용 시점은 ANALYZE_PROMPT 수정 후 회귀 검증, 새 골든셋 추가, 분석 품질 디버깅. 호출 트리거 예: "/eval-face", "골든셋 평가해줘", "프롬프트 회귀 돌려줘", "얼굴형 평가".
---

# eval-face — Claude 정액제로 얼굴 분석 프롬프트 평가

## 목적

`backend/services/rag_service.py` 의 `ANALYZE_PROMPT` 가 골든셋에서 어떤 결과를 내는지 본다. **Gemini API 호출 없이** Claude(정액제 Pro/Max 쿼터) 만 사용한다.

`tools/eval.py` 와 같은 일을 하지만 비용 측면에서 다름:
- `tools/eval.py`: Gemini 종량제 → 분당 호출 제한 + 비용
- 이 스킬: Claude 정액제 → 정액제 안에서 무료처럼 동작

## 입력

- 기본 골든셋: `tools/golden-set.json`
  ```json
  {
    "imagesDir": "src/data/test",
    "items": [
      { "file": "계란형/카리나.jpg", "expectedFaceType": "계란형", "expectedAlternatives": [] }
    ]
  }
  ```
- 인자로 다른 골든셋 경로 받아도 됨 (`/eval-face path/to/custom.json`)

## 워크플로우

1. **프롬프트와 골든셋 로드**
   - `Read` 로 `backend/services/rag_service.py` → `ANALYZE_PROMPT = """..."""` 블록 추출
   - `Read` 로 `tools/golden-set.json` → `imagesDir`, `items` 파싱
2. **각 사진을 Agent 로 평가** (병렬, 한 메시지당 최대 4~5개)
   - 각 item 마다 `Agent({ subagent_type: "general-purpose", description: "Analyze face <file>", prompt: <아래> })`
   - Agent prompt 형식:
     ```
     너는 뷰티 전문가다. 아래 ANALYZE_PROMPT 를 정확히 그대로 적용하여
     이미지의 얼굴형과 features 를 판정한 JSON 한 객체만 출력하라.
     다른 텍스트, 코드 블록, 설명 절대 금지.

     이미지 경로: <imagesDir>/<file> 의 절대 경로.
     이 경로에 Read 툴을 호출하면 multimodal 로 이미지가 보인다. 이를 분석한다.

     <ANALYZE_PROMPT>
     {여기에 backend/services/rag_service.py 에서 추출한 ANALYZE_PROMPT 본문 그대로 삽입}
     </ANALYZE_PROMPT>

     출력 JSON 스키마는 ANALYZE_PROMPT 에 명시된 그대로:
       { "faceType": "...", "features": [...] }
     또는 거부 케이스:
       { "error": "..." }
     ```
3. **응답 파싱**
   - Agent 응답에서 첫 `{ ... }` JSON 블록 추출
   - JSON.parse 실패 시 `{"error": "JSON parse 실패", "raw": "..."}`
4. **비교 + 분류**
   - 각 결과를 다음 카테고리로 분류:
     - `hits`: actual.faceType === expectedFaceType
     - `near`: actual.faceType in expectedAlternatives
     - `ambiguous`: actual.faceType === "판정 어려움"
     - `miss`: 기대값 있는데 hits/near/ambiguous 모두 아님
     - `errors`: error 응답 또는 파싱 실패
5. **저장 + 출력**
   - `tools/eval-claude-results.json` 으로 raw 결과 저장 (timestamp + 모든 응답 포함)
   - 콘솔에 요약 표 출력:
     ```
     === 결과 표 ===
     계란형/카리나.jpg   | expected=계란형   | ✓계란형
     사각형/정유미.jpg   | expected=사각형   | ✗계란형
     ...

     === 요약 ===
     hits=7, near=1, miss=2, ambiguous=0, errors=0  →  정확도 7/10 (70%)
     ```

## 병렬 실행 가이드

한 메시지에 `Agent` tool_use 를 여러 개 넣으면 Claude Code 가 동시에 실행한다.
- 사진 10장 → 2 배치 (5장씩) 로 처리하면 전체 1~3분
- 각 Agent 응답을 다 받은 뒤 다음 배치 시작

## 출력 형식

`tools/eval-claude-results.json`:
```json
{
  "model": "claude-sonnet-4-6 (subscription)",
  "ranAt": "2026-05-08T17:00:00Z",
  "promptHash": "first-200-chars-of-prompt-for-version-pinning",
  "results": [
    {
      "file": "계란형/카리나.jpg",
      "expectedFaceType": "계란형",
      "expectedAlternatives": [],
      "actual": { "faceType": "계란형", "features": ["눈 간격 좁음"] },
      "verdict": "hits"
    }
  ],
  "summary": {
    "total": 10,
    "hits": 7, "near": 1, "miss": 2, "ambiguous": 0, "errors": 0,
    "accuracy": "7/10 (70%)"
  }
}
```

## 한계 (사용자에게 명시)

- **이미지 생성(/api/photo/generate) 평가는 못 함** — Claude 는 이미지 생성 능력 없음
- **카드 생성 프롬프트 평가도 이 스킬 범위 밖** — 별도 스킬 필요시 만들기. 지금은 ANALYZE_PROMPT 만
- **재현성** — Claude 응답이 매번 완전 동일하지는 않음. 진지한 회귀는 N회 반복 평균이 안전하나 비용 절약을 위해 기본 1회만 돌림
- **Gemini 와 결과 다를 수 있음** — Claude 와 Gemini 는 다른 모델이므로 동일 프롬프트에 대한 판정이 갈릴 수 있음. 이 스킬의 목적은 "프롬프트 자체가 합리적인 응답을 끌어내는가" 의 sanity check 이지 운영 정확도 측정이 아님

## 운영 정확도가 필요하면

`tools/eval.py` (Gemini 호출판) 를 같이 돌려라. 두 결과를 비교하면 프롬프트 vs 모델 영향 분리 가능.

## 변경 시 자동 동기화

- `ANALYZE_PROMPT` 가 변하면 다음 호출에서 자동 반영 (매번 `rag_service.py` 에서 새로 읽음)
- 골든셋 추가/변경 → `tools/golden-set.json` 만 수정
- 새 사진 폴더 추가 → `imagesDir` 하위에 두고 `items` 에 등록

## 디버깅 팁

- 어떤 사진에서 자꾸 miss 가 나면 → Agent 응답의 raw 텍스트를 보고 Claude 가 ANALYZE_PROMPT 를 어떻게 해석했는지 확인
- JSON parse 실패 다발 → ANALYZE_PROMPT 끝에 "JSON 만 응답" 류의 강조가 약한 것. 프롬프트 보강 필요
- "판정 어려움" 응답이 너무 많으면 → 프롬프트의 80% 임계값이 너무 보수적
