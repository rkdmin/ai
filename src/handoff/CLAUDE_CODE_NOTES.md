# Claude Code 작업 노트 — 백엔드 정책 변경

## 🚨 변경된 정책: 연예인 레퍼런스 전면 제거

법적 리스크 (퍼블리시티권 침해 — 푸딩얼굴인식 앱 판례 2013가합509239, KT하이텔 1.8억원 패소) 회피를 위해
연예인 이름·사진을 사용하지 않는 방향으로 정책 변경.

## 적용해야 할 변경사항

### 1. 백엔드 응답 스키마 — 다음 필드 제거 또는 무시

```diff
// 카드 공통 필드
{
  "styleLabel": "...",
- "celebrityMatch": "아이유, 윈터 스타일과 유사합니다"
+ "moodLabel": "ROMANTIC · 우아한 분위기"
}
```

```diff
// 분석 응답
{
  "faceType": "...",
  "features": [...],
  "faceRatios": {...},
- "exampleCelebrity": ["카리나", "윈터", "고윤정"]
+ "moodArchetype": ["ROMANTIC", "CLEAN", "SOFT"]
}
```

### 2. RAG JSON 파일 정리

| 파일 | 변경 |
|------|------|
| `backend/data/face-hair.json` | `exampleCelebrity` 필드 → `moodArchetype` 으로 교체 (또는 삭제) |
| `backend/data/face-makeup.json` | `recommendCards[].title` 의 `(탕웨이 st)`, `(김지원 st)` 등 모두 제거 → `(ELEGANT MOOD)`, `(URBAN CHIC)` 같은 무드 키워드로 교체 |
| `backend/data/personal-color-makeup.json` | 동일 — 인물 레퍼런스 제거 |

### 3. Gemini 프롬프트 수정

`backend/services/rag_service.py` 의 `ANALYZE_PROMPT` 와 카드 생성 프롬프트에서:

```diff
- "이 얼굴형과 비슷한 연예인 3명을 추천해주세요"
+ "이 얼굴형의 무드 아키타입을 ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH 중에서 3가지 선택해주세요"

- "○○ 스타일 메이크업"
+ "ELEGANT 무드 메이크업"
```

### 4. 무드 아키타입 사전 (제안)

| 키워드 | 한글 | 톤 |
|---|---|---|
| ROMANTIC | 로맨틱 | 부드럽고 사랑스러운 |
| CLEAN | 클린 | 깨끗하고 단정한 |
| SOFT | 소프트 | 자연스럽고 차분한 |
| ELEGANT | 엘레강트 | 우아하고 도도한 |
| SHARP | 샤프 | 또렷하고 강한 |
| CLASSIC | 클래식 | 시간을 타지 않는 |
| FRESH | 프레시 | 활기차고 산뜻한 |
| EDGY | 엣지 | 개성있고 도시적인 |

각 카드의 추천 컬러 팔레트 (BASE/BLUSH/LIPS/EYES) 를 무드별로 미리 정의해두면 더 좋음.

### 5. 프론트엔드는 이미 정리됨

- `src/components/AnalysisResult.jsx` 의 LOOK-ALIKES 섹션 → MOOD KEYS 로 교체
- `src/components/CardDetail.jsx` 의 REFERENCES 섹션 → MOOD BOARD 로 교체
- 카드 서브 텍스트의 `"○○ st"` → `"ELEGANT MOOD"` 같은 무드 키워드로 교체

백엔드가 아직 옛 필드를 보내도 프론트는 무시함. 백엔드 정리 우선순위는 낮음 (다음 스프린트).

### 6. 테스트 케이스 추가

`tools/eval.py` 의 골든셋 평가 시:

- 응답에 연예인 이름이 포함되면 **fail** 처리
- 무드 키워드가 사전에 정의된 8개 중 하나여야 함
- 정규식: `/카리나|윈터|수지|아이유|탕웨이|김태리|...|st\s*$/` 매칭 시 reject

## 적용 우선순위

1. **즉시** — 프론트 디자인 적용 (이 핸드오프 패키지)
2. **다음 스프린트** — Gemini 프롬프트 수정 + RAG JSON 정리
3. **그 이후** — 백엔드 스키마 정식 변경 + 마이그레이션
