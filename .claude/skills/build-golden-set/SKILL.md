---
name: build-golden-set
description: 골든셋(tools/golden-set.json)에 새 인물 사진을 자동 수집·검증·등록한다. Wikimedia Commons 에서 후보 다운로드 → Sonnet 서브에이전트 시각 검증 → 통과만 등록. URL/파일명/SHA256 3중 dedup 으로 거절된 사진 재다운로드 방지. 호출 트리거 예 - "/build-golden-set", "골든셋 인물 추가해", "테스트 데이터 수집".
---

# build-golden-set — 골든셋 자동 수집

## 목적
`tools/golden-set.json` 의 골든셋을 자동 확장. RAG의 exampleCelebrity 풀(`tools/golden-set-candidates.json`)에서 인물을 골라 사진을 받고, 시각 검증을 통과한 것만 등록한다.

## 입력 (선택)
- 인자 없음 → `golden-set-candidates.json` 의 모든 후보 시도
- `/build-golden-set <얼굴형>` → 그 얼굴형만 시도 (예: `사각형`)
- `/build-golden-set <얼굴형> <인원수>` → 그 얼굴형에 N명만

## 사용 파일
| 파일 | 역할 |
|-----|----|
| `tools/golden-set.json` | 채택된 골든셋 (eval-face 가 사용) |
| `tools/golden-set-candidates.json` | 후보 인물 풀 |
| `tools/golden-set-rejections.json` | 거절 이력 (URL/파일명/SHA256) |
| `tools/golden_set_utils.py` | 정규화·dedup 헬퍼 |

## 워크플로우

### 1. 로드
```bash
cat tools/golden-set.json
cat tools/golden-set-candidates.json
cat tools/golden-set-rejections.json
```
- 이미 golden-set 에 있는 인물명 추출 → skipset 구성
- 인자(얼굴형/인원수)로 후보 풀 필터링

### 2. 각 인물 처리 (1명씩, 최대 5 후보 시도)

**(a) Wikimedia Commons Category URL 찾기**

먼저 commons.wikimedia.org 의 Category 페이지를 찾는다 — 한 인물에 사진 5~30장이 있어 후보 풀이 풍부.
```
WebSearch with query="<이름> commons wikimedia category"
또는 영문명 추정으로 https://commons.wikimedia.org/wiki/Category:<English_Name>

대안 fallback: ko.wikipedia.org/wiki/<이름> → 인포박스 1장만
```

**(b) Category 페이지에서 파일명 리스트 추출**
```
WebFetch(category_url) with prompt:
"Category 페이지의 인물 사진 파일명만 한 줄에 하나씩 출력. .jpg/.png/.webp 확장자 포함, 다른 텍스트 절대 금지."
```

**(c) 사전 필터** (네트워크 0)
```bash
echo "<filenames newline-separated>" | py -3 tools/golden_set_utils.py prefilter
# → {"preferred": [...], "neutral": [...], "excluded": [...]}
```

`preferred` 우선 → `neutral` → `excluded` 는 시도 안 함 (행사·공연·인터뷰 사진).
상위 5개를 후보로 결정.

**(d) 각 후보 파일명 → upload URL**
```bash
py -3 tools/golden_set_utils.py upload-url "<filename>"
# → https://upload.wikimedia.org/wikipedia/commons/<md5[0]>/<md5[:2]>/<filename>
```

> upload URL 은 MD5 해시 기반 결정적 — Commons 파일명만 알면 다운로드 URL 즉시 계산.
> 소스 페이지 다시 fetch 할 필요 없음.

**(c) 거절 사전 필터** (네트워크 비용 0)
```bash
RESULT=$(py -3 tools/golden_set_utils.py canonicalize "<imageUrl>")
CANONICAL=$(echo "$RESULT" | python -c "import json,sys; print(json.loads(sys.stdin.read())['canonical'])")
FILENAME=$(echo "$RESULT" | python -c "import json,sys; print(json.loads(sys.stdin.read())['filename'])")

# URL 매치
py -3 tools/golden_set_utils.py check tools/golden-set-rejections.json --url "$CANONICAL"
# 파일명 매치
py -3 tools/golden_set_utils.py check tools/golden-set-rejections.json --filename "$FILENAME"
```
둘 중 하나라도 `"rejected": true` → 이 후보 SKIP, 다음 URL 시도.

**(d) 다운로드**
```bash
mkdir -p src/data/test/<faceType>/
curl -sSL -A "Mozilla/5.0 (research/golden-set)" "$CANONICAL" -o src/data/test/<faceType>/<이름>.jpg
file src/data/test/<faceType>/<이름>.jpg   # JPEG 확인
```

**(e) SHA256 dedup 체크**
```bash
SHA=$(py -3 tools/golden_set_utils.py sha256 src/data/test/<faceType>/<이름>.jpg)
py -3 tools/golden_set_utils.py check tools/golden-set-rejections.json --sha "$SHA"
```
`rejected: true` → `rm src/data/test/<faceType>/<이름>.jpg` + 다음 후보 시도.

**(f) Agent 시각 검증** (subagent_type: `general-purpose`, **model: `sonnet`** 필수)

Agent prompt 템플릿 (그대로 사용):
```
너는 골든셋 큐레이터다. 다음 사진이 얼굴형 분석 골든셋용으로 적합한지 판정.
JSON 한 객체만 출력 (다른 텍스트·코드블록·마크다운 절대 금지).

이미지 경로: <ABSOLUTE_PATH>
라벨된 얼굴형: <FACE_TYPE>

Read 툴로 이미지 읽고 다음 모두 통과하는지 확인:
1. 정면 (좌우 대칭, 거의 정면 — 측면/3-4 각도 X)
2. 입 다물기 또는 약한 미소 (활짝 웃음/입 벌림 X)
3. 헤어/물체가 양쪽 옆선·턱선·이마 가리지 않음
4. 라벨된 얼굴형이 명확히 보임 — 옆선 직선성·gonial 각짐·세로 비율 등으로 확신 가능
5. 해상도 600px 이상 + 색감 정상 + 보정 과하지 않음

응답: {"accept": true|false, "reason": "1문장"}
```

**(g) 결과 처리**
- `accept: true` → 그대로 둠. golden-set.json 에 entry 추가:
  ```json
  { "file": "<faceType>/<이름>.jpg", "expectedFaceType": "<faceType>", "expectedAlternatives": [] }
  ```
- `accept: false` → 거절 이력 추가 + 파일 삭제:
  ```bash
  py -3 tools/golden_set_utils.py add tools/golden-set-rejections.json \
    "<이름>" "$CANONICAL" "$FILENAME" "$SHA" "<reason from agent>"
  rm src/data/test/<faceType>/<이름>.jpg
  ```
  → 다음 후보 URL 시도

**(h) 후보 3개 다 실패**
- 그 인물 skip
- 사용자 보고에 "<이름>: 위키 후보 3장 모두 부적합. 사용자 직접 추가 필요" 기재

### 3. 결과 요약
```
=== build-golden-set 결과 (2026-05-08) ===
신규 채택: <N>명
  - 사각형: 한효주, 안은진
  - 하트형: 해린

거절 (다음 후보 시도): <M>회

완전 실패 (3 후보 모두 부적합): <K>명
  - 박은빈: 후보 3장 모두 측면/입벌림

골든셋 현황: 9 → 11 (+2)
```

## URL 정규화 규칙
- thumb 패턴: `/wikipedia/commons/thumb/<a>/<ab>/<filename>/<숫자>px-<rest>`
  → canonical: `/wikipedia/commons/<a>/<ab>/<filename>`
- 프로토콜 누락(`//upload...`) → `https://` 보정
- filename URL decode 적용

## 한계 (사용자 보고 시 반드시 명시)
- 한 인물당 최대 3 후보 시도 — 다 실패하면 skip
- Wikimedia 위주 — namu.wiki·네이버 등 저작권 회색지대 사용 X
- Agent 검증 100% 정확 X — 의심되면 사용자 재검토 권장
- 다이아몬드형은 후보 풀 적어 자연 확장 어려움

## 연관 스킬
- `eval-face` — 골든셋 확장 후 회귀 평가용

## 변경 시 동기화
- candidates 추가 → `golden-set-candidates.json` 만 수정
- 새 거절 이력 → 자동 누적 (스킬이 알아서 `golden-set-rejections.json` 추가)
- golden-set.json 직접 수정 금지 (스킬이 관리)
