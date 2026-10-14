"""케미 규칙 테스트 (plan 0009 D08). 결정적이어야 하고, 무드 없는 프로필엔 점수를 지어내지 않는다."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from services.chemistry_service import RULE_VERSION, compute, public_profile, rank  # noqa: E402

SOFT = {"primaryMood": "SOFT", "moodArchetype": ["SOFT", "ROMANTIC", "CLEAN"], "traits": ["곡선 윤곽", "저대비"], "moodTitle": "자연스럽고 차분한"}
SHARP = {"primaryMood": "SHARP", "moodArchetype": ["SHARP", "EDGY", "CLEAN"], "traits": ["직선 윤곽", "고대비"]}
CLEAN = {"primaryMood": "CLEAN", "moodArchetype": ["CLEAN", "CLASSIC", "ELEGANT"], "traits": ["곡선 윤곽"]}


def test_same_input_same_output():
    assert compute(SOFT, SHARP) == compute(SOFT, SHARP)
    assert compute(SOFT, SHARP)["ruleVersion"] == RULE_VERSION


def test_types_follow_mood_families():
    assert compute(SOFT, SOFT)["type"] == "MIRROR"
    assert compute(SOFT, {"primaryMood": "ROMANTIC", "moodArchetype": ["ROMANTIC"]})["type"] == "TWIN"
    assert compute(SOFT, CLEAN)["type"] == "BALANCE"
    assert compute(SOFT, SHARP)["type"] == "SPARK"
    assert compute(CLEAN, SHARP)["type"] == "EDGE"
    assert compute(SHARP, SOFT)["type"] == compute(SOFT, SHARP)["type"]  # 대칭


def test_traits_and_secondary_moods_add_points_but_cap_at_100():
    r = compute(SOFT, SHARP)
    assert r["breakdown"]["traits"] == 12 + 4  # 대비 보완 + 윤곽 다름
    assert r["breakdown"]["secondaryOverlap"] == 7  # CLEAN 공유
    assert r["score"] == 40 + 7 + 16
    assert "대비가 서로를 받쳐 줘요" in r["summary"]
    maxed = compute({**SOFT, "moodArchetype": ["SOFT", "ROMANTIC", "FRESH"]}, {**SOFT, "traits": ["곡선 윤곽", "고대비"]})
    assert maxed["score"] <= 100


def test_profile_without_mood_gets_no_score():
    r = compute(SOFT, {"primaryMood": None, "moodArchetype": [], "traits": []})
    assert r["score"] is None and r["type"] is None
    assert "계산할 수 없어요" in r["summary"]


def test_rank_is_score_desc_then_joined_first():
    ps = [
        {"nickname": "b", "chemistry": {"score": 60}, "joinedAt": "2026-10-14T10:00:00+00:00"},
        {"nickname": "a", "chemistry": {"score": 60}, "joinedAt": "2026-10-14T09:00:00+00:00"},
        {"nickname": "c", "chemistry": {"score": 80}, "joinedAt": "2026-10-14T11:00:00+00:00"},
        {"nickname": "legacy", "chemistry": {"score": None}, "joinedAt": "2026-10-14T08:00:00+00:00"},
    ]
    ordered = rank(ps)
    assert [p["nickname"] for p in ordered] == ["c", "a", "b", "legacy"]
    assert [p["rank"] for p in ordered] == [1, 2, 3, 4]


def test_public_profile_has_no_private_fields():
    p = public_profile({**SOFT, "email": "x@y.z", "frontImageUrl": "https://...", "faceRatios": {"a": 1}}, "민지")
    assert set(p) == {"nickname", "primaryMood", "moodArchetype", "traits", "moodTitle"}
