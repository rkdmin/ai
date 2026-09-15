"""
RAG 컨텍스트 빌더 + 프롬프트 상수.
ANALYZE_PROMPT 의 단일 소스다 — tools/eval.py 와 /eval-face 스킬이 여기서 읽어 간다.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _load(name: str) -> dict:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


_face_hair = _load("face-hair.json")
_face_makeup = _load("face-makeup.json")
_personal_color = _load("personal-color-makeup.json")
_feature_tips = _load("feature-tips.json")

FACE_TYPE_MAP = {
    "계란형": "oval",
    "둥근형": "round",
    "사각형": "square",
    "하트형": "heart",
    "긴형": "long",
    "다이아몬드형": "diamond",
    "땅콩형": "peanut",
}

COLOR_MAP = {
    "봄웜": "spring_warm",
    "여름쿨": "summer_cool",
    "가을웜": "autumn_warm",
    "겨울쿨": "winter_cool",
}

# 무드 아키타입 — 연예인 레퍼런스 대체 (퍼블리시티권 회피 정책)
# 응답에는 반드시 이 8개 중에서만 선택해서 보내야 한다.
MOOD_ARCHETYPES = {
    "ROMANTIC": "부드럽고 사랑스러운",
    "CLEAN": "깨끗하고 단정한",
    "SOFT": "자연스럽고 차분한",
    "ELEGANT": "우아하고 도도한",
    "SHARP": "또렷하고 강한",
    "CLASSIC": "시간을 타지 않는",
    "FRESH": "활기차고 산뜻한",
    "EDGY": "개성있고 도시적인",
}

# ── 정합성 규칙 ───────────────────────────────────────────────────
# 얼굴형 판정과 정면으로 배치되는 feature. 근거는 ANALYZE_PROMPT 의 "형별 정의"다.
# 예) 둥근형은 "gonial 코너 부드러움"이 정의이므로 "사각턱"과 동시에 참일 수 없다.
# 사각형·땅콩형은 각진 하관이 정의라 충돌 항목이 없다 (중복 서술 억제는 프롬프트가 맡는다).
CONFLICTING_FEATURES: dict[str, tuple[str, ...]] = {
    "계란형": ("사각턱",),
    "둥근형": ("사각턱", "중안부 긴 유형"),
    "사각형": (),
    "하트형": ("사각턱", "이마 좁음"),
    "긴형": ("사각턱", "광대 넓음", "중안부 짧은 유형"),
    "다이아몬드형": ("사각턱", "이마 넓음"),
    "땅콩형": (),
}

# 같은 부위의 반대 속성. 동시에 참일 수 없으므로 먼저 나온 쪽만 남긴다.
EXCLUSIVE_FEATURE_PAIRS: tuple[tuple[str, str], ...] = (
    ("눈 간격 넓음", "눈 간격 좁음"),
    ("이마 넓음", "이마 좁음"),
    ("코 낮음", "코 높음"),
    ("입술 얇음", "입술 두꺼움"),
    ("중안부 긴 유형", "중안부 짧은 유형"),
    ("눈두덩이 좁음", "눈두덩이 넓음"),
    ("눈두덩이 살 두꺼움", "눈두덩이 살 얇음"),
    ("눈꼬리 처짐", "눈꼬리 올라감"),
    ("인중 긺", "인중 짧음"),
    ("무턱", "주걱턱"),
)


# ── 데이터 룩업 ───────────────────────────────────────────────────


def _hair_by_face_type(face_type: str) -> dict:
    key = FACE_TYPE_MAP.get(face_type or "")
    for h in _face_hair.get("hairByFaceType", []):
        if h.get("faceType") == key:
            return h
    return {}


def _get_hair_data(analysis: dict) -> dict:
    return _hair_by_face_type(analysis.get("faceType", ""))


def mood_candidates(face_type: str) -> list[str]:
    """얼굴형별 선호 무드 3개. face-hair.json 이 단일 소스다."""
    return list(_hair_by_face_type(face_type).get("moodArchetype") or [])


def mood_banned(face_type: str) -> list[str]:
    """얼굴형과 정면으로 어긋나는 무드 (둥근형 ↔ SHARP 등)."""
    return list(_hair_by_face_type(face_type).get("moodBanned") or [])


def mood_allowed(face_type: str) -> list[str]:
    """금지 무드를 뺀 선택 가능 목록. 선호 무드가 앞에 오도록 정렬한다."""
    banned = set(mood_banned(face_type))
    preferred = [m for m in mood_candidates(face_type) if m not in banned]
    rest = [m for m in MOOD_ARCHETYPES if m not in banned and m not in preferred]
    return preferred + rest


def _get_face_makeup_data(analysis: dict) -> dict:
    key = FACE_TYPE_MAP.get(analysis.get("faceType", ""))
    for m in _face_makeup.get("makeupByFaceShape", []):
        if m.get("faceType") == key:
            return m
    return {}


def _get_personal_color_data(analysis: dict) -> dict | None:
    pc = analysis.get("personalColor")
    key = COLOR_MAP.get(pc) if pc else None
    if not key:
        return None
    for c in _personal_color.get("makeupByPersonalColor", []):
        if c.get("personalColor") == key:
            return c
    return None


def _get_feature_tips(analysis: dict) -> list[dict]:
    out = []
    for f in analysis.get("features", []) or []:
        for t in _feature_tips.get("featureTips", []):
            label = t.get("label", "")
            if f and f in label:
                out.append(t)
                break
    return out


def _fmt_zone(zone: Any) -> str:
    if isinstance(zone, list):
        return ", ".join(zone)
    return zone or ""


# ── 응답 정합성 필터 ──────────────────────────────────────────────


def _has(feature: str, token: str) -> bool:
    """features 표기 흔들림 흡수 — "사각턱" 이 "사각턱 (하관 발달)" 로 와도 잡는다."""
    return token in feature


def _exclusive_conflict(feature: str, kept: list[str]) -> bool:
    for a, b in EXCLUSIVE_FEATURE_PAIRS:
        if _has(feature, a) and any(_has(k, b) for k in kept):
            return True
        if _has(feature, b) and any(_has(k, a) for k in kept):
            return True
    return False


def sanitize_analysis(analysis: dict) -> dict:
    """얼굴형과 모순되는 값을 사용자 화면에 닿기 전에 걷어낸다.

    ANALYZE_PROMPT 가 같은 규칙을 지시하지만 모델 응답은 확률적이라 마지막 방어선을 둔다.
    **비어버린 features 를 임의로 채우지 않는다** — 분석하지 않은 특징을 지어내느니
    적게 보여주는 쪽이 맞다 (UI 가 0~3개를 그대로 렌더한다).
    무드는 예외다. 얼굴형별 선호 무드는 RAG 가 이미 정의해 둔 값이라 폴백해도 창작이 아니다.
    """
    face_type = analysis.get("faceType") or ""
    conflicting = CONFLICTING_FEATURES.get(face_type, ())

    kept: list[str] = []
    dropped: list[str] = []
    for f in analysis.get("features") or []:
        if not isinstance(f, str) or not f.strip():
            continue
        f = f.strip()
        if any(_has(f, c) for c in conflicting) or _exclusive_conflict(f, kept) or f in kept:
            dropped.append(f)
            continue
        kept.append(f)

    banned = set(mood_banned(face_type))
    moods: list[str] = []
    dropped_moods: list[str] = []
    for m in analysis.get("moodArchetype") or []:
        key = str(m).strip().upper()
        if key not in MOOD_ARCHETYPES or key in banned or key in moods:
            dropped_moods.append(str(m))
            continue
        moods.append(key)
    for m in mood_candidates(face_type):
        if len(moods) >= 3:
            break
        if m not in moods and m not in banned:
            moods.append(m)

    if dropped or dropped_moods:
        # 충돌이 잦으면 features 가 아니라 얼굴형 판정을 의심해야 한다. 그 신호로 남긴다.
        print(
            f"[rag] 정합성 필터 faceType={face_type} "
            f"features 제거={dropped} moods 제거={dropped_moods}",
            file=sys.stderr,
        )

    # 확신도가 낮은데도 확정 판정이 나오는 경향이 있다 (골든셋에서 55~62 관측).
    # 임계 처리는 아직 넣지 않고 관측만 남긴다 — ADR 0009 "남은 것" 참조.
    reason = analysis.get("faceTypeReason") or {}
    confidence = reason.get("confidence")
    unobservable = [k for k, v in reason.items() if isinstance(v, str) and "관찰 불가" in v]
    if confidence is not None or unobservable:
        print(
            f"[rag] 판정 근거 faceType={face_type} confidence={confidence} "
            f"decidedAt={reason.get('decidedAt')} 관찰불가={unobservable}",
            file=sys.stderr,
        )

    out = dict(analysis)
    out["features"] = kept
    out["moodArchetype"] = moods
    return out


# ── 헤어 컨텍스트 (뷰 ①) ─────────────────────────────────────────


def build_hair_context(analysis: dict) -> str:
    hair = _get_hair_data(analysis)
    tips = _get_feature_tips(analysis)

    recs_text = "\n".join(
        f"  {r.get('priority')}순위) {r.get('style')} (앞머리: {r.get('bangs') or '없음'}) — {r.get('reason', '')}"
        for r in hair.get("recommend", [])
    )
    avoid_text = " / ".join(
        f"{a.get('style')}: {a.get('reason')}"
        for a in hair.get("avoid", [])
    )

    moods = ", ".join(hair.get("moodArchetype", []) or []) or "—"
    banned = ", ".join(hair.get("moodBanned", []) or []) or "없음"
    hair_ctx = (
        f"[헤어 — {analysis.get('faceType')}]\n"
        f"무드 후보: {moods} (이 얼굴형에 금지된 무드: {banned})\n"
        f"추천 스타일:\n{recs_text}\n"
        f"피해야 할: {avoid_text}\n"
        f"코치: {hair.get('coachComment', '')}"
    )

    hair_tips = [t for t in tips if (t.get("hairTip") or {}).get("content")]
    tips_ctx = ""
    if hair_tips:
        lines = []
        for t in hair_tips:
            ht = t["hairTip"]
            override = ", ".join(ht.get("overrideTargets", []) or []) or "없음"
            lines.append(f"{t.get('label')}: {ht.get('content')} (오버라이드: {override})")
        tips_ctx = "\n[이목구비 헤어 팁 — 최우선 적용]\n" + "\n".join(lines)

    return hair_ctx + tips_ctx


# ── 메이크업 컨텍스트 (뷰 ②③) ────────────────────────────────────


def build_makeup_context(analysis: dict) -> str:
    face = _get_face_makeup_data(analysis)
    color = _get_personal_color_data(analysis)
    tips = _get_feature_tips(analysis)

    face_cards_lines = []
    for c in face.get("recommendCards", []):
        shading = c.get("shading") or {}
        highlight = c.get("highlight") or {}
        blush = c.get("blush") or {}
        eyebrow = c.get("eyebrow") or {}
        lip = c.get("lip") or {}
        face_cards_lines.append(
            f"  {c.get('priority')}순위) {c.get('title')}\n"
            f"    쉐딩: zone=[{_fmt_zone(shading.get('zone'))}] method={shading.get('method', '')} — {shading.get('reason', '')}\n"
            f"    하이라이트: zone=[{_fmt_zone(highlight.get('zone'))}] method={highlight.get('method', '')} — {highlight.get('reason', '')}\n"
            f"    블러셔: zone={blush.get('zone', '')} shape={blush.get('shape', '')} — {blush.get('reason', '')}\n"
            f"    눈썹: shape={eyebrow.get('shape', '')} — {eyebrow.get('reason', '')}\n"
            f"    립: texture={lip.get('texture', '')} method={lip.get('method', '')} — {lip.get('reason', '')}\n"
            f"    코치: {c.get('coachComment', '')}"
        )
    face_cards = "\n\n".join(face_cards_lines)

    base_skin = face.get("baseSkin") or {}
    avoid_card = face.get("avoidCard") or {}
    face_type = analysis.get("faceType", "")
    moods = ", ".join(mood_candidates(face_type)) or "—"
    banned = ", ".join(mood_banned(face_type)) or "없음"
    face_ctx = (
        f"무드 후보: {moods} (이 얼굴형에 금지된 무드: {banned})\n"
        f"[얼굴형 메이크업 — {analysis.get('faceType')} (위치/방법 레이어)]\n"
        f"피부 베이스: {base_skin.get('texture', '')} — {base_skin.get('reason', '')}\n"
        f"추천 카드:\n{face_cards}\n"
        f"피해야 할: {avoid_card.get('title', '')} — {avoid_card.get('reason', '')}\n"
        f"코치: {face.get('coachComment', '')}"
    )

    if color:
        color_card_lines = []
        for c in color.get("colorCards", []):
            parts = []
            for slot, label in (
                ("lip", "립"),
                ("blush", "블러셔"),
                ("eyeshadow", "아이섀도우"),
                ("eyebrow", "눈썹"),
                ("eyeliner", "아이라이너"),
                ("highlighter", "하이라이터"),
                ("baseSkin", "피부 베이스"),
            ):
                slot_data = c.get(slot) or {}
                vibe = slot_data.get("colorVibe")
                if not vibe:
                    continue
                if slot == "lip":
                    texture = slot_data.get("texture", "")
                    parts.append(f"립 colorVibe={vibe} (texture={texture})")
                else:
                    parts.append(f"{label} colorVibe={vibe}")
            color_card_lines.append(
                f"  {c.get('priority')}순위) {c.get('title')}: {', '.join(parts)} — 코치: {c.get('coachComment', '')}"
            )
        color_cards = "\n".join(color_card_lines)

        avoid_text = " / ".join(
            f"{a.get('style')}({a.get('reason')})" for a in (color.get("avoid") or [])
        )

        color_ctx = (
            f"\n\n[퍼스널컬러 — {analysis.get('personalColor')} (컬러 레이어)]\n"
            f"{color.get('description', '')}\n"
            f"컬러 카드:\n{color_cards}\n"
            f"피해야 할: {avoid_text}\n"
            f"코치: {color.get('coachComment', '')}\n\n"
            # 파트를 열거하지 않는다. 퍼스널컬러 카드가 담는 파트는 4개 톤마다 다르다
            # (shading 은 autumn_warm 에만, highlighter 는 spring_warm 에만 있는 식).
            # 열거하면 없는 파트의 색을 지어내거나, 있는 파트를 그냥 지나친다.
            "[병합 규칙 — 반드시 준수]\n"
            "- 위치·형태·제형(zone, shape, texture, method)은 얼굴형 기준을 그대로 유지\n"
            "- 컬러(colorVibe)는 퍼스널컬러 기준으로 오버라이드\n"
            "- 위 [퍼스널컬러] 블록에 있는 파트는 전부 그 컬러를 따른다 (파트 종류를 가리지 않음)\n"
            "- 그 블록에 없는 파트는 얼굴형 기준을 그대로 쓴다. **색을 지어내지 말 것**\n"
            "- 모순 발생 시 반드시 해결하여 자연스러운 하나의 조합으로 통합\n"
            "- 충돌 우선순위: featureTip > personalcolor > face-makeup"
        )
    else:
        color_ctx = "\n[퍼스널컬러 미정: 색상 정보 없음 — 질감·위치·방법 위주로만 설명하세요]"

    makeup_tips = [t for t in tips if (t.get("makeupTip") or {}).get("content")]
    tips_ctx = ""
    if makeup_tips:
        lines = []
        for t in makeup_tips:
            mt = t["makeupTip"]
            override = ", ".join(mt.get("overrideTargets", []) or []) or "없음"
            lines.append(f"{t.get('label')}: {mt.get('content')} (오버라이드: {override})")
        tips_ctx = (
            "\n\n[이목구비 메이크업 팁 — 최우선 적용 (featureTip > personalcolor > face-makeup)]\n"
            + "\n".join(lines)
        )

    return face_ctx + color_ctx + tips_ctx


# ── 종합 컨텍스트 (뷰 ④) ─────────────────────────────────────────


def build_total_context(analysis: dict) -> str:
    return build_makeup_context(analysis) + "\n\n" + build_hair_context(analysis)


# ── 카드 출력 포맷 (Gemini 응답 스키마) ────────────────────────────


HAIR_CARDS_FORMAT = """[
  {
    "type": "recommend",
    "rank": 1,
    "cardType": "hair",
    "mood": "스타일 무드명",
    "moodLabel": "무드 아키타입 + 한국어 분위기 (예: ROMANTIC · 우아한 분위기). 연예인 비교 절대 금지.",
    "emoji": "이모지 1개",
    "hair": "헤어스타일명",
    "bangs": "앞머리 스타일 (예: 없음 / 시스루뱅 / 사이드뱅 / 풀뱅)",
    "hairReason": "얼굴형 기준으로 왜 어울리는지 1문장",
    "featureTip": "이목구비 특징 기반 헤어 팁 1문장 (특징 없으면 null)",
    "coachComment": "헤어 중심 전체 조언 2-3문장"
  },
  { "type": "recommend", "rank": 2, "cardType": "hair", "mood": "...", "moodLabel": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "hair", "mood": "...", "moodLabel": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "hair",
    "mood": "피해야 할 헤어스타일",
    "moodLabel": null,
    "emoji": "⚠️",
    "hair": "피해야 할 헤어스타일명",
    "bangs": null,
    "hairReason": "왜 안 어울리는지 1문장",
    "featureTip": null,
    "coachComment": "왜 이 헤어가 맞지 않는지 2-3문장"
  }
]"""

MAKEUP_CARDS_FORMAT = """[
  {
    "type": "recommend",
    "rank": 1,
    "cardType": "makeup",
    "mood": "스타일 무드명",
    "moodLabel": "무드 아키타입 + 한국어 분위기 (예: ELEGANT · 우아한 분위기). 연예인 비교 절대 금지.",
    "emoji": "이모지 1개",
    "baseSkin": "피부 표현 방식 (예: Semi-Glow, Center Glow, Matte)",
    "makeup": {
      "shading": "쉐딩 위치+방법 설명", "shadingReason": "이유 1문장",
      "highlight": "하이라이트 위치+방법 설명", "highlightReason": "이유 1문장",
      "blush": "블러셔 위치+형태+컬러 통합 설명", "blushReason": "이유 1문장",
      "eyebrow": "눈썹 형태+컬러 통합 설명", "eyebrowReason": "이유 1문장",
      "lip": "립 제형+방법+컬러 통합 설명", "lipReason": "이유 1문장",
      "eyeshadow": "아이섀도우 컬러 설명 (퍼스널컬러 없으면 null)", "eyeshadowReason": "이유 1문장 (없으면 null)",
      "eyeliner": "아이라이너 컬러 설명 (퍼스널컬러 없으면 null)", "eyelinerReason": "이유 1문장 (없으면 null)"
    },
    "featureTip": "이목구비 특징 기반 메이크업 팁 1문장 (특징 없으면 null)",
    "coachComment": "메이크업 중심 전체 조언 2-3문장"
  },
  { "type": "recommend", "rank": 2, "cardType": "makeup", "mood": "...", "moodLabel": "...", "emoji": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "makeup", "mood": "...", "moodLabel": "...", "emoji": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "makeup",
    "mood": "피해야 할 메이크업",
    "moodLabel": null,
    "emoji": "⚠️",
    "baseSkin": null,
    "makeup": {
      "shading": "피해야 할 쉐딩", "shadingReason": "이유 1문장",
      "highlight": null, "highlightReason": null,
      "blush": "피해야 할 블러셔", "blushReason": "이유 1문장",
      "eyebrow": null, "eyebrowReason": null,
      "lip": "피해야 할 립", "lipReason": "이유 1문장",
      "eyeshadow": null, "eyeshadowReason": null,
      "eyeliner": null, "eyelinerReason": null
    },
    "featureTip": null,
    "coachComment": "왜 이 메이크업이 맞지 않는지 2-3문장"
  }
]"""

TOTAL_CARDS_FORMAT = """[
  {
    "type": "recommend",
    "rank": 1,
    "cardType": "total",
    "mood": "스타일 무드명",
    "moodLabel": "무드 아키타입 + 한국어 분위기 (예: CLASSIC · 시간을 타지 않는). 연예인 비교 절대 금지.",
    "emoji": "이모지 1개",
    "hair": "헤어스타일명",
    "bangs": "앞머리 스타일",
    "hairReason": "왜 어울리는지 1문장",
    "baseSkin": "피부 표현 방식",
    "makeup": {
      "shading": "...", "shadingReason": "...",
      "highlight": "...", "highlightReason": "...",
      "blush": "...", "blushReason": "...",
      "eyebrow": "...", "eyebrowReason": "...",
      "lip": "...", "lipReason": "...",
      "eyeshadow": "...", "eyeshadowReason": "...",
      "eyeliner": "...", "eyelinerReason": "..."
    },
    "featureTip": "이목구비 종합 팁 1문장 (특징 없으면 null)",
    "coachComment": "헤어+메이크업 종합 전체 조언 2-3문장"
  },
  { "type": "recommend", "rank": 2, "cardType": "total", "mood": "...", "moodLabel": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "total", "mood": "...", "moodLabel": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "total",
    "mood": "피해야 할 스타일",
    "moodLabel": null,
    "emoji": "⚠️",
    "hair": "피해야 할 헤어스타일",
    "bangs": null,
    "hairReason": "왜 안 어울리는지 1문장",
    "baseSkin": null,
    "makeup": {
      "shading": "피해야 할 쉐딩", "shadingReason": "이유 1문장",
      "highlight": null, "highlightReason": null,
      "blush": "피해야 할 블러셔", "blushReason": "이유 1문장",
      "eyebrow": null, "eyebrowReason": null,
      "lip": "피해야 할 립", "lipReason": "이유 1문장",
      "eyeshadow": null, "eyeshadowReason": null,
      "eyeliner": null, "eyelinerReason": null
    },
    "featureTip": null,
    "coachComment": "왜 이 스타일 조합이 맞지 않는지 2-3문장"
  }
]"""

# check-file:allow-policy-terms — 아래 프롬프트는 금지어를 "쓰지 말라"고 지시하는 본문이다.
# 마커를 문자열 밖에 두는 이유: 안에 넣으면 그 줄이 Gemini 프롬프트로 그대로 전송된다.
ANALYZE_PROMPT = """당신은 뷰티 전문가입니다. 다른 텍스트는 절대 포함하지 마세요.

## 우선 검사 — 분석 불가 판정 (보수적으로 판단할 것)
아래 조건 중 하나라도 해당되면, 다른 분석 없이 이 형식으로만 응답하세요:
{"error": "사유를 한 문장으로"}

거부 조건:
1. **실사 사진이 아닌 경우** — 다음을 모두 거부:
   - 일러스트, 만화, 애니메이션, 캐릭터, 그림, 페인팅, 스케치, 디지털 아트
   - 3D 렌더링, CGI, 게임 캐릭터, 메타휴먼, 픽사 스타일
   - AI 생성 이미지(생성형 모델로 만든 인물), 딥페이크
   - 이모지, 스티커, 아이콘, 마스코트
   - 인형, 피규어, 조각상, 마네킹, 가면, 코스프레 가면
   판단 신호: 셀 셰이딩(평면 색감), 비현실적 큰 눈/작은 코, 비현실적 헤어 컬러(보라·파랑 등),
   피부에 모공·자연 음영 없음, 윤곽선이 진하게 그려져 있음, 그림자가 단순화돼 있음 → 모두 거부
2. 사람 얼굴이 없는 경우 (동물, 사물, 음식, 풍경, 텍스트 이미지 등)
3. 얼굴이 너무 작거나 흐려서 이목구비를 식별할 수 없는 경우
4. 측면·뒷모습으로 정면 분석이 불가능한 경우
5. 마스크·선글라스 등으로 얼굴이 절반 이상 가려진 경우
6. 여러 사람이 있어 분석 대상을 특정할 수 없는 경우

**원칙**: 실사인지 애매하면 거부하세요. 사용자가 잘못된 분석을 받는 것보다 "실사 사진을 올려주세요" 안내를 받는 게 낫습니다.

위 조건에 해당하지 않으면 아래 JSON으로 응답하세요:

{
  "faceTypeReason": {
    "step1_sideLine": "'직선' | '곡선' | '관찰 불가' 중 하나 + 무엇을 보고 그렇게 판단했는지 한 문장",
    "step2_cheekbone": "'넓음' | '아님' | '관찰 불가' 중 하나 + 한 문장",
    "step3_vertical": "세로 우세 정도 — '보통' | '확연히 김' 중 하나 + 한 문장 근거",
    "decidedAt": 1,
    "confidence": 70
  },
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 | 판정 어려움 중 하나",
  "features": ["확실히 보이는 특징만, 0개도 가능"],
  "moodArchetype": ["이 얼굴이 풍기는 무드 키워드 3개"]
}

## faceTypeReason 작성 규칙 (반드시 faceType 보다 먼저 채울 것)
- **JSON 필드 순서를 위 예시 그대로 지키세요.** `faceTypeReason` 을 먼저 쓰고, 거기서 관찰한
  결과로 `faceType` 을 도출하세요. 결론을 먼저 정한 뒤 근거를 끼워 맞추면 안 됩니다.
  이 순서를 지키지 않으면 아래 "분류 우선순위"를 실제로 밟지 않고 인상만으로 답하게 됩니다.
- `step1_sideLine` / `step2_cheekbone` / `step3_vertical` 은 아래 분류 우선순위 1·2·3번 검사에
  그대로 대응합니다. 건너뛰지 말고 순서대로 실제로 검사하세요.
- **머리카락·손·촬영 각도 때문에 볼 수 없으면 솔직하게 "관찰 불가" 라고 쓰세요.** 추측으로 메우지 마세요.
  관찰 불가 항목이 2개 이상이면 `판정 어려움` 을 우선 검토하세요.
  - 어디까지가 관찰 불가인가: **머리카락이 턱 모서리(gonial)나 광대 아래 옆선을 덮고 있으면
    `step1_sideLine` 은 "관찰 불가" 입니다.** 앞머리가 헤어라인을 덮어 이마 폭을 비교할 수 없으면
    `step2_cheekbone` 도 "관찰 불가" 입니다.
  - **"가려져 있지만 ~로 보인다" 는 관찰 불가입니다.** 보이는 일부로 추정한 값을 확정처럼 쓰지 마세요.
    가려진 사실을 문장에 적었다면 값도 "관찰 불가" 여야 합니다 — 서술과 값이 어긋나면 안 됩니다.
- `decidedAt`: 얼굴형이 분류 우선순위 몇 번 단계에서 결정됐는지 (1~4 정수).
- `confidence`: 최종 판정의 확신도 (0~100 정수). 아래 "경계형 처리"의 80% 기준과 같은 척도입니다.

## 분석 원칙 (반드시 준수)
- **확실한 것만 포함**: 사진을 보고 즉시 "이건 확실하다"고 판단되는 것만 포함하세요.
- **애매하면 제외**: "아마도", "~인 것 같다", "~일 수도 있다" 수준이면 포함하지 마세요.
- **억지로 채우지 말 것**: 목록을 채우기 위해 불확실한 항목을 넣는 것은 잘못된 분석입니다. 빈 배열([])도 정답입니다.

## moodArchetype 판단 기준 (퍼블리시티권 회피 — 인물 비교 절대 금지)
- 반드시 아래 8개 중에서만 정확히 3개를 선택하세요. 다른 단어를 만들어내지 마세요.
- **얼굴형을 먼저 판정한 뒤**, 그 얼굴형의 선호 무드에서 최소 2개를 고르세요. 나머지 1개는
  금지 무드가 아닌 것 중에서 자유롭게 고르세요. 얼굴형과 무드가 어긋나면(둥근형인데 SHARP 등)
  사용자는 앞뒤가 안 맞는 결과를 받게 됩니다.
- 연예인·인물 이름·고유명사("○○ 스타일", "○○ st", "look-alike" 포함) 절대 금지.
- 인물과 닮았다고 비교하지 말고, 얼굴이 풍기는 인상·무드만 판단하세요.

선택 가능 목록 (영문 키워드):
- ROMANTIC: 부드럽고 사랑스러운
- CLEAN: 깨끗하고 단정한
- SOFT: 자연스럽고 차분한
- ELEGANT: 우아하고 도도한
- SHARP: 또렷하고 강한
- CLASSIC: 시간을 타지 않는
- FRESH: 활기차고 산뜻한
- EDGY: 개성있고 도시적인

얼굴형별 선호 / 금지 무드:
<<MOOD_TABLE>>

---

## 얼굴형 판단 기준

### 분류 우선순위 (위에서부터 순서대로 검사)
1. **사각형/땅콩형 검사 — 옆선의 직선성 우선**
   - 광대 아래쪽 옆얼굴 선이 곡선이 아닌 **거의 평행한 직선**으로 내려오다가 턱 모서리(gonial)에서 꺾이면 사각/땅콩 후보
   - **턱끝 모양(V/U/사각) 무관** — V턱이어도 옆선이 직선이면 사각형이다 (계란형 아님)
   - 얼굴 길이 무관 — 짧은 사각, 긴 사각 모두 포함
   - 광대까지 발달했으면 땅콩형, 광대 부드러우면 사각형
   - 흔한 오판: V턱 + 갸름함 → 계란형으로 잘못 봄. 옆선이 직선이면 사각형이다.
2. **하트형/다이아몬드형 검사 — 광대가 가장 넓은가**
   - 광대 폭이 이마·턱보다 명확히 넓으면 후보
   - 이마도 넓으면 하트형, 이마·턱 모두 좁으면 다이아몬드형
3. **긴형 검사 — 세로 우세 + 갸름**
   - 위에 해당 안 되고, 얼굴 세로가 가로보다 **눈에 띄게** 길다
   - **광대도 좁아 전체적으로 갸름**: 이마·중안부·턱 모두 길쭉하게 늘어진 인상
   - 판단은 사진의 시각적 인상으로 한다. MediaPipe `aspectRatio` 로 재지 마라 —
     그 수치는 이마 상단~턱끝만 재서 실제 얼굴 길이보다 짧게 나오고, 얼굴형과 상관이 없다
   - 흔한 오판: V턱 + 갸름함 → 계란형으로 잘못 봄. 세로 길이가 압도적이면 긴형이다.
4. **계란형/둥근형** (위 모두 해당 안 됨)
   - 골격 특징 약하고 부드러우면 — 길이 적당하면 계란형, 둥근편이면 둥근형

### 형별 정의
- 계란형: 이마가 약간 넓고 턱으로 갈수록 **부드러운 곡선**으로 좁아지는 형태. **gonial 코너 부드러움**, 옆선이 곡선. 길이는 적당 (5:4~5:5 비율).
- 둥근형: 얼굴 폭과 길이가 비슷하고 전체 윤곽이 부드럽고 볼살이 있는 형태. gonial 코너 부드러움.
- 사각형: **광대 아래 옆선이 직선적으로 내려와 턱 모서리(gonial)에서 꺾이는 형태**. 옆선의 곡선성이 약함. 턱끝은 V/U/사각 어느 형태든 무관. 얼굴 길이 무관 (짧은 사각/긴 사각 모두 포함). **계란형과의 차이는 옆선 직선성**.
- 하트형: 이마·광대가 넓고 턱 끝이 뾰족하게 좁아지는 형태. gonial 부드러움.
- 긴형: 얼굴 **세로 길이가 가로 폭보다 확연히 김**. 광대도 좁아 갸름. 이마·중안부·턱이 길쭉. gonial 부드러움 (각지면 사각형으로). **계란형과의 차이는 세로 길이의 압도성과 광대의 좁음**.
- 다이아몬드형: 옆광대가 가장 넓고 이마와 턱이 모두 좁은 형태. gonial 부드러움.
- 땅콩형: **gonial 코너 각짐 + 광대도 발달**. 볼이 살짝 패여 라인이 울퉁불퉁.

### 자주 헷갈리는 케이스 — 결정 트리
- **V턱이고 갸름한 사진**:
  - 광대 아래 옆선이 직선 → **사각형**
  - 옆선은 곡선이고 세로가 압도적으로 김 → **긴형**
  - 옆선이 곡선이고 길이는 보통 → **계란형**
- **광대가 발달한 사진**:
  - 턱 모서리도 각짐 → **땅콩형**
  - 턱은 부드럽고 이마도 넓음 → **하트형**
  - 턱·이마 모두 좁음 → **다이아몬드형**

### 경계형 처리 — "판정 어려움"
두 얼굴형 사이 경계(예: 다이아몬드/하트, 땅콩/사각, 계란/긴)에서 어느 쪽으로도 80% 이상 확신할 수 없다면 "판정 어려움"으로 응답하세요.
이 값은 사용자가 어느 한 쪽으로 잘못 안내받는 것보다 낫다고 판단될 때만 사용하세요. 남발하지 마세요.

---

## features 판단 기준
아래 목록에서 **사진에서 명확하게 눈에 띄는 특징만** 골라 정확히 이 텍스트 그대로 사용하세요.
확신도 80% 미만이면 포함하지 마세요. 3개를 목표로 하되, 확실한 것이 부족하면 더 적어도 됩니다.
4개 이상이면 다시 검토하세요.

### 판단 순서 (반드시 이 순서로 검사)
같은 사진을 다시 분석하면 **같은 특징이 나와야 합니다.** 눈에 먼저 걸린 것을 집으면 회차마다
다른 답이 나옵니다. 그래서 아래 4개 부위를 **순서대로** 검사하고, 각 부위에서 확실한 것을
최대 1개만 고르세요.

1. 눈 (모양 → 쌍꺼풀 → 눈꼬리 → 간격 → 눈두덩이)
2. 코
3. 입술 · 인중
4. 윤곽 여백 (이마 · 광대 · 관자놀이 · 중안부 · 턱)

3개가 차면 남은 부위는 검사하지 않고 멈춥니다. 부위를 건너뛰지도 마세요 — 1번에서 확실한 것이
없으면 없는 대로 두고 2번으로 갑니다.

### 라벨별 관찰 기준 (이 기준으로만 판단하세요 — 인상으로 고르지 마세요)

**1. 눈**
- 모양 (최대 1개): 가로:세로 비율로 본다. 3:1 이상으로 길고 눈꼬리가 뾰족 → "긴 눈" /
  2:1 안팎이고 눈꼬리가 완만한 타원 → "아몬드 눈" / 세로가 커서 원에 가까움 → "둥근 눈"
- "눈 작음": 얼굴 폭 대비 눈 가로폭이 작아 눈이 얼굴에 묻히는 경우만. 모양 라벨과 같이 쓰지 마세요.
- "삼백안": 검은 눈동자의 위·아래로 흰자가 함께 보이는 경우.
- 쌍꺼풀 (최대 1개): 선이 전혀 보이지 않음 → "무쌍" / 선이 눈두덩이 살에 덮여 일부만 보임 → "속쌍꺼풀".
  겉쌍꺼풀이 뚜렷하면 둘 다 넣지 않습니다 (해당 라벨이 없습니다).
- 눈꼬리 (최대 1개): 눈 앞머리와 눈꼬리를 이은 선이 바깥으로 내려감 → "눈꼬리 처짐" / 올라감 →
  "눈꼬리 올라감" / 눈꼬리 각이 살에 덮여 보이지 않음 → "눈꼬리 막힘".
  **거의 수평이면 아무것도 넣지 마세요.**
- 간격: 두 눈 사이 거리를 한쪽 눈 가로폭과 비교. 명확히 크면 "눈 간격 넓음", 명확히 작으면
  "눈 간격 좁음". 비슷하면 넣지 않습니다.
- 눈두덩이: 쌍꺼풀선(또는 눈꺼풀)~눈썹 아래 세로 여백이 넓으면 "눈두덩이 넓음", 좁으면 "눈두덩이 좁음".
  그 부위가 도톰하게 부풀어 음영이 없으면 "눈두덩이 살 두꺼움", 눌린 듯 얇으면 "눈두덩이 살 얇음".

**2. 코**
- "코 낮음" / "코 높음": 콧대에 하이라이트와 좌우 음영이 뚜렷하면 높음, 거의 없이 평평하면 낮음.
- "코 큼": 콧방울 폭이 두 눈 사이 거리보다 넓은 경우.

**3. 입술 · 인중**
- "입술 두꺼움" / "입술 얇음": 위+아래 입술 세로 두께의 합을 입 가로폭과 비교. 1/3 이상이면 두꺼움,
  1/5 이하면 얇음.
- "인중 긺" / "인중 짧음": 코 밑~윗입술 거리를 윗입술~턱끝 거리와 비교. 1/3 이상이면 긺, 1/5 이하면 짧음.
- "돌출입": 입이 코끝·턱끝을 이은 선보다 앞으로 나온 경우. 정면 사진에서는 입 주변 음영으로만
  추정되므로 확실하지 않으면 넣지 마세요.

**4. 윤곽 여백**
- "이마 넓음" / "이마 좁음": 헤어라인~눈썹 세로 길이가 얼굴 전체 길이의 1/3 을 넘으면 넓음,
  1/4 미만이면 좁음. **앞머리로 헤어라인이 가려지면 판단하지 말고 넣지 마세요.**
- "광대 넓음": 광대 폭이 이마·턱 폭보다 뚜렷하게 넓은 경우.
- "관자놀이 여백 넓음": 눈꼬리 바깥~헤어라인 사이 여백이 눈 가로폭 이상인 경우.
- "중안부 긴 유형" / "중안부 짧은 유형": 눈썹~코끝 길이를 얼굴 세로의 1/3 과 비교.
- 턱: 턱끝이 뒤로 물러나 목선과의 경계가 흐리면 "무턱", 턱끝이 앞으로 나오면 "주걱턱".
  "사각턱" 은 아래 정합성 규칙을 먼저 확인하세요.

### 정면 얼굴 사진으로 판정할 수 없는 라벨
"목 짧음", "콘헤드", "어깨 너비 넓음", "승모근 발달" 은 목·어깨·두상이 함께 보이지 않으면
판단할 수 없습니다. 얼굴만 나온 사진에서는 **넣지 마세요.**

### 정합성 규칙 (features 를 확정하기 전 반드시 재검토)
- **판정한 얼굴형과 상충하는 특징은 넣지 마세요.** 상충 목록:
  - 계란형·둥근형·하트형·긴형·다이아몬드형 → "사각턱" 불가 (이 형들은 gonial 코너가 부드럽다는 것이 정의)
  - 하트형 → "이마 좁음" 불가 (이마가 넓다는 것이 정의)
  - 다이아몬드형 → "이마 넓음" 불가 (이마가 좁다는 것이 정의)
  - 긴형 → "광대 넓음", "중안부 짧은 유형" 불가 (광대가 좁고 중안부가 길다는 것이 정의)
  - 둥근형 → "중안부 긴 유형" 불가 (폭과 길이가 비슷하다는 것이 정의)
- 상충하는 특징이 사진에서 확실히 보인다면, **그 특징을 빼기 전에 얼굴형 판정을 먼저 다시 검토하세요.**
  (예: 둥근형으로 봤는데 "사각턱"이 뚜렷하다면 → 광대 아래 옆선의 직선성을 다시 보고 사각형 가능성 검토)
- 재검토 후에도 얼굴형이 맞다면 그 특징은 확신 부족으로 보고 제외하고, **얼굴형과 무관한 이목구비
  특징(눈매·쌍꺼풀·눈꼬리·코·입술·인중 등)에서 대신 채우세요.** 아래 목록 대부분이 여기 해당합니다.
- **같은 부위의 반대 속성을 동시에 넣지 마세요.** (넓음↔좁음, 긺↔짧음, 처짐↔올라감, 두꺼움↔얇음,
  무턱↔주걱턱, 코 낮음↔높음)
- 얼굴형 정의에 이미 들어 있는 특징은 중복 기재하지 마세요. (사각형에 "사각턱" 등)

선택 가능 목록:
"눈 간격 넓음", "눈 간격 좁음", "코 낮음", "코 높음", "코 큼",
"이마 넓음", "이마 좁음", "눈 작음", "광대 넓음", "입술 얇음",
"입술 두꺼움", "중안부 긴 유형", "중안부 짧은 유형", "눈두덩이 좁음",
"눈두덩이 넓음", "관자놀이 여백 넓음", "사각턱", "돌출입", "목 짧음",
"무쌍", "속쌍꺼풀", "눈꼬리 처짐", "눈꼬리 올라감", "눈꼬리 막힘",
"눈두덩이 살 두꺼움", "눈두덩이 살 얇음", "둥근 눈", "아몬드 눈", "긴 눈",
"삼백안", "인중 긺", "인중 짧음", "무턱", "주걱턱", "콘헤드",
"어깨 너비 넓음", "승모근 발달\""""


def _build_mood_table() -> str:
    """얼굴형별 선호/금지 무드 표. face-hair.json 을 단일 소스로 프롬프트에 주입한다."""
    lines = []
    for kr in FACE_TYPE_MAP:
        hair = _hair_by_face_type(kr)
        pref = ", ".join(hair.get("moodArchetype") or []) or "—"
        ban = ", ".join(hair.get("moodBanned") or []) or "없음"
        lines.append(f"- {kr}: 선호 {pref} / 금지 {ban}")
    return "\n".join(lines)


ANALYZE_PROMPT = ANALYZE_PROMPT.replace("<<MOOD_TABLE>>", _build_mood_table())
