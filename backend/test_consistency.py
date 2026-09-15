"""얼굴형 ↔ features ↔ 무드 정합성 회귀 테스트 (Gemini 호출 0).

"둥근형인데 사각턱", "둥근형인데 SHARP" 처럼 서로 모순되는 값이 사용자 화면까지
새어나가지 않는지 본다. 프롬프트 지시는 확률적이라 sanitize_analysis 가 마지막 방어선이다.

실행:
  cd backend && .venv/Scripts/python.exe -m pytest test_consistency.py -v
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")

from services import gemini_service  # noqa: E402
from services.rag_service import (  # noqa: E402
    ANALYZE_PROMPT,
    MOOD_ARCHETYPES,
    build_hair_context,
    build_makeup_context,
    mood_allowed,
    mood_banned,
    sanitize_analysis,
)


# ─── features 정합성 ──────────────────────────────────────────────


def test_둥근형에서_사각턱은_제거된다():
    out = sanitize_analysis({"faceType": "둥근형", "features": ["사각턱", "무쌍"]})
    assert out["features"] == ["무쌍"]


def test_사각형에서_사각턱은_유지된다():
    out = sanitize_analysis({"faceType": "사각형", "features": ["사각턱", "무쌍"]})
    assert out["features"] == ["사각턱", "무쌍"]


def test_긴형은_광대_넓음과_중안부_짧은_유형을_함께_제거한다():
    out = sanitize_analysis(
        {"faceType": "긴형", "features": ["광대 넓음", "중안부 짧은 유형", "코 높음"]}
    )
    assert out["features"] == ["코 높음"]


def test_표기가_흔들려도_잡는다():
    out = sanitize_analysis({"faceType": "하트형", "features": ["사각턱 (하관 발달)"]})
    assert out["features"] == []


def test_같은_부위의_반대_속성은_먼저_나온_쪽만_남는다():
    out = sanitize_analysis(
        {"faceType": "계란형", "features": ["눈꼬리 처짐", "눈꼬리 올라감", "인중 긺", "인중 짧음"]}
    )
    assert out["features"] == ["눈꼬리 처짐", "인중 긺"]


def test_비어버린_features_를_임의로_채우지_않는다():
    # 지어낸 특징을 보여주느니 적게 보여준다. UI 가 0개를 그대로 렌더한다.
    out = sanitize_analysis({"faceType": "둥근형", "features": ["사각턱", "중안부 긴 유형"]})
    assert out["features"] == []


def test_판정_어려움이면_features_를_거르지_않는다():
    out = sanitize_analysis({"faceType": "판정 어려움", "features": ["사각턱", "광대 넓음"]})
    assert out["features"] == ["사각턱", "광대 넓음"]


# ─── 무드 정합성 ──────────────────────────────────────────────────


def test_둥근형에서_SHARP_는_제거되고_선호_무드로_채워진다():
    out = sanitize_analysis({"faceType": "둥근형", "moodArchetype": ["SHARP", "EDGY", "ROMANTIC"]})
    assert "SHARP" not in out["moodArchetype"]
    assert "EDGY" not in out["moodArchetype"]
    assert out["moodArchetype"][0] == "ROMANTIC"
    assert len(out["moodArchetype"]) == 3


def test_사각형은_SHARP_를_유지하고_ROMANTIC_을_제거한다():
    out = sanitize_analysis({"faceType": "사각형", "moodArchetype": ["SHARP", "ROMANTIC", "CLASSIC"]})
    assert out["moodArchetype"] == ["SHARP", "CLASSIC", "ELEGANT"]


def test_8개_밖의_무드와_중복은_걸러진다():
    out = sanitize_analysis(
        {"faceType": "계란형", "moodArchetype": ["CLEAN", "CLEAN", "우아함", "CLASSIC"]}
    )
    assert out["moodArchetype"] == ["CLEAN", "CLASSIC", "ELEGANT"]
    assert all(m in MOOD_ARCHETYPES for m in out["moodArchetype"])


def test_허용_무드에는_금지_무드가_없다():
    for face_type in ("계란형", "둥근형", "사각형", "하트형", "긴형", "다이아몬드형", "땅콩형"):
        allowed = set(mood_allowed(face_type))
        assert allowed and not (allowed & set(mood_banned(face_type))), face_type


# ─── 프롬프트 주입 ────────────────────────────────────────────────


def test_분석_프롬프트가_정합성_규칙과_무드표를_담는다():
    assert "정합성 규칙" in ANALYZE_PROMPT
    assert "얼굴형 판정을 먼저 다시 검토" in ANALYZE_PROMPT
    assert "둥근형: 선호 ROMANTIC, FRESH, SOFT / 금지 SHARP, EDGY" in ANALYZE_PROMPT


def test_분석_프롬프트가_features_판단_순서를_고정한다():
    """부위 순서를 안 주면 회차마다 다른 특징을 집는다 (2026-09-15 안정성 Jaccard 0.37 관측)."""
    assert "판단 순서" in ANALYZE_PROMPT
    assert "라벨별 관찰 기준" in ANALYZE_PROMPT
    # 4개 부위가 순서대로 제시되는지
    order = ["1. 눈", "2. 코", "3. 입술 · 인중", "4. 윤곽 여백"]
    positions = [ANALYZE_PROMPT.index(o) for o in order]
    assert positions == sorted(positions), "부위 검사 순서가 흐트러졌다"


def test_정면_사진으로_판정_불가한_라벨은_넣지_말라고_지시한다():
    """목·어깨·두상은 얼굴 크롭에 없다. 골든셋 27회에서 한 번도 등장하지 않았다."""
    section = ANALYZE_PROMPT.split("정면 얼굴 사진으로 판정할 수 없는 라벨")[1]
    for label in ("목 짧음", "콘헤드", "어깨 너비 넓음", "승모근 발달"):
        assert label in section, label
    assert "넣지 마세요" in section


def test_관찰_불가_판단_기준이_명시되어_있다():
    """가려졌다고 서술하면서 값은 확정으로 내는 패턴이 27회 전부에서 관측됐다."""
    assert "가려져 있지만 ~로 보인다" in ANALYZE_PROMPT
    assert "머리카락이 턱 모서리(gonial)나 광대 아래 옆선을 덮고 있으면" in ANALYZE_PROMPT


def test_카드_프롬프트가_얼굴형별_금지_무드를_명시한다():
    analysis = {"faceType": "둥근형", "features": ["눈꼬리 처짐"], "moodArchetype": ["ROMANTIC"]}
    prompt = gemini_service._build_cards_prompt(analysis, "ctx", "fmt", "헤어", "rule")
    assert "SHARP, EDGY 는 이 얼굴형과 어긋나므로 사용 금지" in prompt
    assert "SHARP" not in prompt.split("허용된 무드(")[1].split(")")[0]
    assert "판정된 얼굴형(둥근형)이 갖지 않는 특성을 근거로 들지 마세요" in prompt


def test_features_가_비면_카드_프롬프트가_지어내지_말라고_지시한다():
    analysis = {"faceType": "둥근형", "features": [], "moodArchetype": ["ROMANTIC"]}
    prompt = gemini_service._build_cards_prompt(analysis, "ctx", "fmt", "헤어", "rule")
    assert "뚜렷하게 두드러지는 특징 없음" in prompt
    assert "featureTip 을 지어내지 말고 null 로 두세요" in prompt


def test_RAG_컨텍스트가_금지_무드를_함께_넘긴다():
    analysis = {"faceType": "둥근형"}
    assert "금지된 무드: SHARP, EDGY" in build_hair_context(analysis)
    # 메이크업 컨텍스트에는 무드 후보가 아예 없었다 — 헤어와 같은 소스에서 주입한다.
    assert "금지된 무드: SHARP, EDGY" in build_makeup_context(analysis)


# ─── 판정 근거 필드 (ADR 0009) ────────────────────────────────────


def test_프롬프트가_근거를_faceType_보다_먼저_요구한다():
    # 필드 순서가 핵심이다. 결론을 먼저 뱉으면 분류 우선순위를 실제로 밟지 않는다.
    assert ANALYZE_PROMPT.index("faceTypeReason") < ANALYZE_PROMPT.index('"faceType"')
    assert "faceType 보다 먼저 채울 것" in ANALYZE_PROMPT
    assert "관찰 불가" in ANALYZE_PROMPT


def test_sanitize_가_판정_근거를_보존한다():
    reason = {
        "step1_sideLine": "관찰 불가 — 머리카락이 턱선을 덮음",
        "step2_cheekbone": "아님",
        "step3_vertical": "약 1.2",
        "decidedAt": 4,
        "confidence": 55,
    }
    out = sanitize_analysis(
        {"faceTypeReason": reason, "faceType": "둥근형", "features": ["사각턱"], "moodArchetype": []}
    )
    assert out["faceTypeReason"] == reason
    assert out["features"] == []


def test_응답_스키마가_근거_필드를_받는다():
    from models.schemas import AnalyzeResponse

    r = AnalyzeResponse(
        faceType="둥근형",
        features=[],
        faceTypeReason={"confidence": 70, "decidedAt": 4},
    )
    assert r.faceTypeReason["confidence"] == 70
    # 기존 응답(근거 없음)도 그대로 통과해야 한다 — 선택 필드다.
    assert AnalyzeResponse(faceType="둥근형", features=[]).faceTypeReason is None


def test_도달_불가능한_세로비_기준이_없다():
    """골든셋 실측 최대가 1.234 라 'aspectRatio 1.4 이상' 은 아무도 못 넘는 기준이었다.

    항상 참인 배제 조건은 정보가 없을 뿐 아니라 긴형 판정을 원천 차단한다.
    상세: tools/eval-analysis-2026-08-19.json
    """
    assert "1.4" not in ANALYZE_PROMPT
