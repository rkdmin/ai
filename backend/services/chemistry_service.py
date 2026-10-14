"""
케미 계산 (plan 0009 P6 · D08·F08, ADR 0010 R07 추천안).

규칙 기반이다 — 같은 두 프로필이면 항상 같은 결과. 사전은 backend/data/chemistry.json 하나다.
입력은 **공개 요약**(primaryMood, moodArchetype, traits)만 쓴다. 원본 사진·이메일·전체 이력은 받지도 않는다.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATA = json.loads((Path(__file__).resolve().parent.parent / "data" / "chemistry.json").read_text(encoding="utf-8"))

RULE_VERSION: int = int(DATA["ruleVersion"])
_FAMILY_OF: dict[str, str] = {m: fam for fam, moods in DATA["families"].items() for m in moods}
_AXIS_OF: dict[str, str] = {t: axis for axis, traits in DATA["traitAxes"].items() for t in traits}


def _summary(profile: dict[str, Any]) -> dict[str, Any]:
    """케미 계산과 공개 DTO 에 쓰는 최소 요약. 여기 없는 것은 밖으로 나가지 않는다."""
    moods = [str(m).upper() for m in (profile.get("moodArchetype") or [])]
    primary = str(profile.get("primaryMood") or (moods[0] if moods else "")).upper()
    return {
        "primaryMood": primary or None,
        "moodArchetype": moods[:3],
        "traits": [str(t) for t in (profile.get("traits") or [])][:2],
        "moodTitle": profile.get("moodTitle"),
    }


def public_profile(profile: dict[str, Any], nickname: str) -> dict[str, Any]:
    return {"nickname": nickname, **_summary(profile)}


def compute(owner: dict[str, Any], friend: dict[str, Any]) -> dict[str, Any]:
    """두 프로필의 케미. 반환: type·label·score·breakdown·summary·ruleVersion."""
    a, b = _summary(owner), _summary(friend)
    pa, pb = a["primaryMood"], b["primaryMood"]
    if not pa or not pb:
        # 무드가 없는 프로필(legacy)과는 계산하지 않는다 — 지어내지 않는다
        return {"ruleVersion": RULE_VERSION, "type": None, "label": None, "score": None, "summary": "무드 정보가 없어 케미를 계산할 수 없어요.", "breakdown": {}}

    if pa == pb:
        type_key = "MIRROR"
    else:
        fa, fb = _FAMILY_OF.get(pa, "soft"), _FAMILY_OF.get(pb, "soft")
        key = "+".join(sorted((fa, fb), key=lambda f: ["soft", "clean", "bold"].index(f)))
        type_key = DATA["pairToType"].get(key, "BALANCE")
    spec = DATA["types"][type_key]
    base = spec["base"]

    shared = {m for m in a["moodArchetype"] if m != pa} & {m for m in b["moodArchetype"] if m != pb}
    overlap = min(len(shared) * DATA["secondaryMoodOverlap"]["perShared"], DATA["secondaryMoodOverlap"]["max"])

    trait_points = 0
    trait_notes: list[str] = []
    ta = {_AXIS_OF.get(t): t for t in a["traits"] if t in _AXIS_OF}
    tb = {_AXIS_OF.get(t): t for t in b["traits"] if t in _AXIS_OF}
    rules = DATA["traitRules"]
    if "contrast" in ta and "contrast" in tb:
        if ta["contrast"] != tb["contrast"]:
            trait_points += rules["contrast"]["complement"]
            trait_notes.append("대비가 서로를 받쳐 줘요")
        else:
            trait_points += rules["contrast"]["same"]
            trait_notes.append("대비의 결이 같아요")
    for axis in ("outline", "proportion"):
        if axis in ta and axis in tb:
            same = ta[axis] == tb[axis]
            trait_points += rules[axis]["same"] if same else rules[axis]["different"]
            trait_notes.append(("윤곽" if axis == "outline" else "비율") + ("이 닮았어요" if same else "이 달라 서로 보완해요"))

    score = min(base + overlap + trait_points, DATA["scoreCap"])
    summary = spec["summary"] + (" " + " · ".join(trait_notes) if trait_notes else "")
    return {
        "ruleVersion": RULE_VERSION,
        "type": type_key,
        "label": spec["label"],
        "score": score,
        "breakdown": {"base": base, "secondaryOverlap": overlap, "traits": trait_points},
        "summary": summary,
    }


def rank(participants: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """점수 내림차순, 동점은 먼저 참여한 순(joinedAt 오름차순). 점수 없는(legacy) 참여자는 맨 뒤."""
    def key(p: dict[str, Any]):
        score = (p.get("chemistry") or {}).get("score")
        return (0 if score is None else 1, score or 0, -_ts(p.get("joinedAt")))
    ordered = sorted(participants, key=key, reverse=True)
    for i, p in enumerate(ordered, 1):
        p["rank"] = i
    return ordered


def _ts(value: Any) -> float:
    from datetime import datetime
    if not value:
        return 0.0
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0
