# tools/

정확도 검증용 로컬 스크립트.

> **운영 코드 아님.** 측정 로직은 이미 `backend/services/mediapipe_service.py` 로 이관됐고
> 백엔드가 그것을 쓴다. 이 디렉토리는 **골든셋 회귀 평가용으로 남겨둔 것**이다.
> Gemini 비용 없이 돌리려면 `/eval-face` 스킬을 쓴다 (`.claude/skills/eval-face/`).

## ⚠️ 골든셋 사진의 성격 (반드시 알고 쓸 것)

<!-- check-file:allow-policy-terms — 아래는 금지 범위를 규정하는 설명이다. -->

`tools/golden-set.json` 이 참조하는 `src/data/test/` 의 이미지 9장은 **실제 공인(연예인) 사진**이며
파일명도 인물명이다. `src/assets/dev-sample-face.jpg` 도 그 중 한 장이다. 모두 git 에 추적된다.

이 프로젝트의 전역 불변식 1번(`CLAUDE.md`)은 **제품 산출물**에서 인물 비교를 금지한다.
골든셋은 그 금지 대상이 아니라 **내부 정확도 평가 fixture** 다. 둘을 섞지 마라.

지켜야 할 경계:

- 이 사진과 인물명을 **API 응답·UI·로그·공유 이미지·프롬프트 예시에 절대 넣지 않는다.**
  평가 스크립트 입력으로만 쓴다.
- 평가 결과를 문서에 남길 때 인물명을 쓰지 말고 얼굴형 라벨로만 표기한다
  (`계란형 #1` 처럼). `/eval-face` 산출물도 같다.
- 골든셋을 늘릴 때는 인물 사진 대신 라이선스가 명확한 이미지나 생성 이미지를 우선 검토한다.

> **미해결**: 이 사진들의 사용 근거(라이선스·출처)가 저장소 어디에도 기록되어 있지 않다.
> 초상권과 사진 저작권은 별개 문제이므로 공개 배포 전에 정리가 필요하다.

---

## 셋업 (이미 완료된 머신)

Python 3.11.9 설치됨. venv는 `tools/.venv/` 에 이미 만들어져 있고 mediapipe 0.10.35 설치 완료.

활성화 후 사용:
```powershell
cd C:\Users\user\IdeaProjects\ai\tools
.\.venv\Scripts\Activate.ps1
# 프롬프트 앞에 (.venv) 표시
```

> **참고**: 이 머신은 `python` 명령이 Microsoft Store stub을 가리킴. 활성화 안 한 상태에서는
> `py` 런처를 쓰거나 `& .\.venv\Scripts\python.exe` 로 직접 호출.

다른 머신에서 처음 셋업하는 경우:
```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> 첫 실행 시 `face_landmarker.task` 모델(~3.7MB)을 `tools/.cache/` 로 자동 다운로드.

---

## 사용법

> **정면 사진 전용.** 측면 사진을 넣으면 MediaPipe가 얼굴은 잡아도 비율값이 의미 없음.
> 측면(90도·45도)은 Gemini 보조 판단용으로만 쓰기로 정해져 있음 (`docs/decisions/0002-phase1-face-accuracy-rag.md` 1-3).

### 단일 이미지

```powershell
python tools/landmark.py path/to/photo.jpg
```

출력 (stdout):
```json
{
  "file": "path/to/photo.jpg",
  "faceRatios": {
    "foreheadRatio": 0.93,
    "jawRatio": 0.78,
    "aspectRatio": 1.32,
    "jawAngle": 128.4,
    "upperFaceRatio": 0.31,
    "midFaceRatio": 0.34,
    "lowerFaceRatio": 0.35,
    "eyeGapRatio": 0.34,
    "eyeOpennessRatio": 0.05,
    "lipWidthRatio": 0.41
  }
}
```

### 디렉토리 일괄

```powershell
python tools/landmark.py path/to/folder/ -o results.json
```

`results.json`에 `[{file, faceRatios}, ...]` 배열 저장.

---

## 비율값 해석 가이드

| 키 | 의미 | 일반 범위 (참고) |
|----|------|---------------|
| `foreheadRatio` | 이마폭 / 광대폭 | 0.85~1.05 — 1.0 이상이면 이마가 광대보다 넓음 (하트형 후보) |
| `jawRatio` | 턱폭 / 광대폭 | 0.70~0.95 — 0.9+ 이면 사각형/땅콩형 후보 |
| `aspectRatio` | 얼굴 길이 / 광대폭 | 1.25~1.55 — 1.45+ 이면 긴형 후보 |
| `jawAngle` | 턱각도 (좌우 평균, gonial 점 기준 광대↔턱끝 사이 각) | 115~150° — 작을수록 사각, 클수록 둥글 |
| `upperFaceRatio` / `midFaceRatio` / `lowerFaceRatio` | 상·중·하안부 비율 | 1/3씩이 이상 |
| `eyeGapRatio` | 눈 간격 / 광대폭 | 0.30~0.38 |
| `eyeOpennessRatio` | 눈 세로 / 광대폭 | 0.04~0.07 |
| `lipWidthRatio` | 입꼬리 거리 / 광대폭 | 0.38~0.46 |

> **임계값으로 박지 마세요.** Gemini에 참고지표로 넘겨 종합 판단을 시키는 게 본 단계의 목표.

---

## 다음 단계

1. 본인 사진 10~15장으로 디렉토리 일괄 실행 → `results.json`
2. 각 사진의 자가평가 얼굴형과 비교해 `foreheadRatio`/`jawRatio`/`jawAngle` 값이 얼굴형 분류 직관과 맞는지 확인
3. 특히 경계형(다이아몬드/하트, 땅콩/사각) 케이스에서 수치가 어느 쪽으로 기울어지는지 메모
4. 골든셋 회귀 스크립트(1-7)에서 본 출력을 Gemini analyzeFace에 `faceRatios`로 주입해 기대값과 비교
