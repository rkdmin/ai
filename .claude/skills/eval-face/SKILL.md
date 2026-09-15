---
name: eval-face
description: 골든셋 사진들에 backend ANALYZE_PROMPT 를 돌려 두 축을 채점한다 — 얼굴형 판정 정확도, 그리고 features(얼굴 특징) 의 수율·커버리지·안정성·어휘·정합성. Gemini API 비용 없이 Claude 정액제 쿼터로 동작. 사용 시점은 ANALYZE_PROMPT 수정 후 회귀 검증, 새 골든셋 추가, 분석 품질 디버깅. 호출 트리거 예: "/eval-face", "골든셋 평가해줘", "프롬프트 회귀 돌려줘", "얼굴형 평가", "얼굴 특징 평가해줘", "features 평가".
---

# eval-face — Claude 정액제로 얼굴 분석 프롬프트 평가

## 목적

`backend/services/rag_service.py` 의 `ANALYZE_PROMPT` 가 골든셋에서 어떤 결과를 내는지 본다. **Gemini API 호출 없이** Claude(정액제 Pro/Max 쿼터) 만 사용한다.

채점하는 축은 둘이다.

| 축 | 재는 것 | ground truth |
|---|---|---|
| **얼굴형** | `faceType` 이 기대값과 맞는가 | 골든셋 폴더명 (사용자 자가평가) |
| **features** | 수율·커버리지·안정성·어휘·정합성 | **없다** — 라벨 없이 재는 지표만 쓴다 |

`tools/eval.py` 와 같은 일을 하지만 비용 측면에서 다름:
- `tools/eval.py`: Gemini 종량제 → 분당 호출 제한 + 비용
- 이 스킬: Claude 정액제 → 정액제 안에서 무료처럼 동작

**채점 로직은 `tools/score_features.py` 가 단일 소스다. 이 스킬 안에서 지표를 다시 계산하지 마라** —
사본을 두면 조용히 어긋난다 (ADR 0009 #5: `eval.py` 가 실제로 그랬다).

## 인자

```
/eval-face                      # 두 축 모두, runs=1
/eval-face features             # features 축 집중, runs=3 (안정성 측정에 반복이 필요)
/eval-face --runs 3             # 반복 횟수 지정
/eval-face path/to/custom.json  # 다른 골든셋
```

- `runs=1` 이면 **안정성은 측정 불가**다. 리포트에 "미측정" 으로 표시하고 넘어간다.
- 호출 수 = 사진 수 × runs. 골든셋 9장 × 3회 = Agent 27회. 사용자에게 미리 알린다.

## 입력

- 기본 골든셋: `tools/golden-set.json`
  ```json
  {
    "imagesDir": "src/data/test",
    "items": [
      { "file": "계란형/카리나.jpg", "expectedFaceType": "계란형", "expectedAlternatives": [],
        "expectedFeatures": [], "forbiddenFeatures": [] }
    ]
  }
  ```
- `expectedFeatures` / `forbiddenFeatures` 는 **선택**이다 (Phase B). 붙은 사진만 features 정확도가
  계산되고 나머지는 무채점이다. 애매한 특징을 억지로 라벨링하지 마라 — 가짜 정밀도가 된다.

## 워크플로우

1. **프롬프트와 골든셋 로드**
   - `Read` 로 `backend/services/rag_service.py` → `ANALYZE_PROMPT = """..."""` 블록 추출
   - `Read` 로 `tools/golden-set.json` → `imagesDir`, `items` 파싱
2. **각 사진을 Agent 로 평가** (병렬, 한 메시지당 최대 4~5개)
   - item × runs 조합마다 `Agent({ subagent_type: "general-purpose", model: "sonnet", description: "Analyze face <file> run<N>", prompt: <아래> })`
   - **`model: "sonnet"` 필수** — Opus 는 정액제 쿼터를 빠르게 소진하므로 평가용은 Sonnet 으로 고정
   - 같은 사진의 반복 회차는 **서로 다른 Agent** 여야 한다 (한 Agent 에 N회 시키면 자기 답을 베껴 안정성이 과대평가된다)
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
       { "faceTypeReason": {...}, "faceType": "...", "features": [...], "moodArchetype": [...] }
     또는 거부 케이스:
       { "error": "..." }
     ```
3. **응답 파싱**
   - Agent 응답에서 첫 `{ ... }` JSON 블록 추출
   - JSON.parse 실패 시 `{"error": "JSON parse 실패", "raw": "..."}`
   - **features 를 손대지 마라.** 표기 흔들림·화이트리스트 밖 라벨·중복이 그대로 있어야
     `score_features.py` 가 어휘 위반으로 잡을 수 있다. 정규화는 채점기 몫이다.
4. **얼굴형 축 채점** (회차 단위로 센다 — `eval.py` 와 같은 방식)
   - `hits`: `faceType === expectedFaceType`
   - `near`: `faceType in expectedAlternatives`
   - `ambiguous`: `faceType === "판정 어려움"`
   - `miss`: 기대값 있는데 위 셋 모두 아님
   - `errors`: error 응답 또는 파싱 실패
   - `consistent`: 같은 사진의 모든 회차가 동일한 `faceType` (runs≥2 일 때만)
5. **결과 저장** — `tools/eval-claude-results.json` (아래 "출력 형식")
6. **features 축 채점 — 직접 계산 금지, 채점기를 실행한다**
   ```bash
   PYTHONIOENCODING=utf-8 backend/.venv/Scripts/python.exe tools/score_features.py tools/eval-claude-results.json --golden tools/golden-set.json
   ```
   - 표준출력 리포트를 그대로 사용자에게 보여준다
   - 지표를 결과 JSON 에 함께 넣으려면 `--json` 으로 한 번 더 돌려 `featuresSummary` 에 담는다
   - `backend/.venv` 가 없으면 `CLAUDE.md` 의 백엔드 venv 절차를 안내한다 (Python 3.11)
7. **리포트 출력** — 얼굴형 표 + features 리포트 + 아래 해석

## 출력 형식

`tools/eval-claude-results.json`:
```json
{
  "model": "claude-sonnet-x (subscription)",
  "ranAt": "2026-09-15",
  "runs": 3,
  "promptSource": "backend/services/rag_service.py:ANALYZE_PROMPT",
  "results": [
    {
      "file": "계란형/카리나.jpg",
      "expectedFaceType": "계란형",
      "expectedAlternatives": [],
      "runs": [
        { "faceType": "계란형", "features": ["아몬드 눈"], "moodArchetype": ["CLEAN", "ELEGANT", "FRESH"],
          "faceTypeReason": { "decidedAt": 4, "confidence": 72 } }
      ],
      "verdicts": ["hits"]
    }
  ],
  "summary": { "total": 9, "hits": 5, "near": 0, "miss": 4, "ambiguous": 0, "errors": 0,
               "accuracy": "5/9 (55.6%)", "consistent": 7 },
  "featuresSummary": { "...": "score_features.py --json 출력" }
}
```

`runs[]` 이 정본 형식이다. 예전 파일은 회차 하나를 `actual` 에 담고 있고 채점기가 둘 다 읽는다.

## 지표 해석 — 무엇이 나쁘면 무엇을 의심하나

| 지표 | 나쁠 때 의심할 곳 |
|---|---|
| **수율** (장당 개수 ↓) | 프롬프트의 확신도 80% 임계가 과보수 / 화이트리스트에 정면 사진으로 관찰 불가능한 라벨이 섞임 |
| **커버리지** (등장 라벨 ↓) | `feature-tips.json` 의 나머지 항목이 죽은 데이터 → 사용자가 매번 비슷한 팁을 받는다 (제품 영향) |
| **안정성** (Jaccard ↓, 반대속성 충돌) | **가장 강한 신호.** 같은 얼굴에서 "눈 간격 넓음/좁음" 이 갈리면 정확도를 논할 필요 없이 라벨 정의·판단 기준이 모호한 것 |
| **어휘** (화이트리스트 밖 / 표기 흔들림) | "정확히 이 텍스트 그대로" 지시가 약함 → `_has()` 흡수에 의존하게 된다 |
| **정합성** (`CONFLICTING`/`EXCLUSIVE` 위반) | 프롬프트의 정합성 규칙이 안 먹고 `sanitize_analysis` 사후 필터에만 의존하는 상태 |

기준선 (2026-09-15 실측, 9장 × 3회 = 27회, Claude Sonnet):

| 축 | v1 (5837자) | v2 (7995자, 판단 순서·관찰 기준 추가) |
|---|---|---|
| 얼굴형 정확 | 13/27 (48.1%) | 12/27 (44.4%) |
| 얼굴형 오답 | **14** | **9** |
| 판정 어려움 | 0 | **6** |
| 회차 일관 | 7/9 | 4/9 |
| 수율 | 1.0개 · 0개 6/27 | **1.41개** · 0개 2/27 |
| 커버리지 | 6/37 | **8/37** |
| 안정성 Jaccard | 0.37 | **0.488** |
| 어휘 위반 | 0/27 | 0/27 |
| 정합성 위반 | 0/27 | 0/27 |
| confidence 평균 | 64.7 (전부 80 미달) | 58.8 (전부 80 미달) |
| 관찰 불가 신고 | **0회차** | **15회차** (2개 이상 6회차) |

읽는 법:
- v2 는 **오답을 판정 어려움으로 바꿨다** (오답 14→9, 판정 어려움 0→6). 정확 건수는 거의 같다.
  회차 일관 7/9 → 4/9 하락도 같은 원인이다 — 같은 사진에서 확정 판정과 판정 어려움이 섞인다.
- 안정성 0.488 은 여전히 절반이다. 개선 방향은 맞지만 목표에는 멀다. 다음 손댈 곳은
  `아몬드 눈` 편중(8/37 커버리지)과 눈 모양 3분류(긴/아몬드/둥근) 경계다.
- **confidence 는 v1·v2 모두 27회 전부 80 미달이다.** 자동 강등은 여전히 불가 —
  ADR 0009 의 결정(관측만)이 유지되는 근거다.

## 사후 필터와 역할 분담

- `backend/test_consistency.py` (pytest) — `sanitize_analysis` 가 모순을 **걷어내는지** 결정론적으로 검증한다
- 이 스킬 — 모델의 **raw 응답**이 규칙을 애초에 지키는지 실사진에서 측정한다

즉 정합성 위반이 여기서 0이 아니면 "필터가 있으니 괜찮다" 가 아니라 "프롬프트가 안 먹고 있다" 로 읽어라.

## 병렬 실행 가이드

한 메시지에 `Agent` tool_use 를 여러 개 넣으면 Claude Code 가 동시에 실행한다.
- 사진 9장 × 1회 → 2 배치 (5개씩), 전체 1~3분
- 9장 × 3회 = 27개 → 5~6 배치. 배치 응답을 다 받은 뒤 다음 배치 시작

## 한계 (사용자에게 명시)

- **features 정확도는 라벨 없이는 못 잰다** — Phase A 지표는 "정확한가" 가 아니라 "일관되고 다양하고 규칙을 지키는가" 다
- **이미지 생성(/api/photo/generate) 평가는 못 함** — Claude 는 이미지 생성 능력 없음
- **카드 생성 프롬프트 평가도 이 스킬 범위 밖** — 별도 스킬 필요시 만들기. 지금은 ANALYZE_PROMPT 만
- **재현성** — Claude 응답이 매번 완전 동일하지는 않음. `--runs` 로 반복하면 그 변동성 자체가 안정성 지표가 된다
- **Gemini 와 결과 다를 수 있음** — Claude 와 Gemini 는 다른 모델이므로 동일 프롬프트에 대한 판정이 갈릴 수 있음. 이 스킬의 목적은 "프롬프트 자체가 합리적인 응답을 끌어내는가" 의 sanity check 이지 운영 정확도 측정이 아님
- **골든셋 편중** — 9장 전부 여성 정면 사진이다. 커버리지 수치는 이 편중을 함께 반영한다

## 운영 정확도가 필요하면

`tools/eval.py` (Gemini 호출판) 를 같이 돌려라. 같은 `score_features.py` 로 features 축을 채점하므로
두 결과를 같은 척도로 비교할 수 있고, 프롬프트 영향과 모델 영향을 분리할 수 있다.

## 변경 시 자동 동기화

- `ANALYZE_PROMPT` 가 변하면 다음 호출에서 자동 반영 (매번 `rag_service.py` 에서 새로 읽음)
- features 화이트리스트도 `ANALYZE_PROMPT` 에서 파싱하므로 라벨을 추가·삭제하면 채점기가 바로 따라간다
- 골든셋 추가/변경 → `tools/golden-set.json` 만 수정
- 새 사진 폴더 추가 → `imagesDir` 하위에 두고 `items` 에 등록

## 디버깅 팁

- 어떤 사진에서 자꾸 miss 가 나면 → Agent 응답의 `faceTypeReason` 을 보고 어느 단계에서 판정이 갈렸는지 확인 (`decidedAt` 4 + `confidence` 60 미만이 몰리면 계란형이 기본값처럼 작동하는 패턴)
- JSON parse 실패 다발 → ANALYZE_PROMPT 끝에 "JSON 만 응답" 류의 강조가 약한 것. 프롬프트 보강 필요
- "판정 어려움" 응답이 너무 많으면 → 프롬프트의 80% 임계값이 너무 보수적
- features 가 0개인 사진이 많으면 → 같은 사진을 `--runs 3` 으로 다시 돌려봐라. 회차마다 0개면 기준이 보수적인 것이고, 회차마다 갈리면 기준이 모호한 것이다
