"""
RAG 컨텍스트 빌더 + 프롬프트 상수.
src/utils/ragUtils.js 의 Python 포팅판. 프롬프트 문자열은 1:1 동치를 유지한다.
"""
from __future__ import annotations

import json
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


# ── 데이터 룩업 ───────────────────────────────────────────────────


def _get_hair_data(analysis: dict) -> dict:
    key = FACE_TYPE_MAP.get(analysis.get("faceType", ""))
    for h in _face_hair.get("hairByFaceType", []):
        if h.get("faceType") == key:
            return h
    return {}


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

    hair_ctx = (
        f"[헤어 — {analysis.get('faceType')}]\n"
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
    face_ctx = (
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
            "[병합 규칙 — 반드시 준수]\n"
            "- blush.zone, blush.shape → 얼굴형 기준 유지\n"
            "- blush.colorVibe → 퍼스널컬러로 오버라이드\n"
            "- lip.texture, lip.method → 얼굴형 기준 유지\n"
            "- lip.colorVibe → 퍼스널컬러로 오버라이드\n"
            "- eyeshadow, eyeliner, highlighter 컬러 → 퍼스널컬러로 오버라이드\n"
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
    "emoji": "이모지 1개",
    "hair": "헤어스타일명",
    "bangs": "앞머리 스타일 (예: 없음 / 시스루뱅 / 사이드뱅 / 풀뱅)",
    "hairReason": "얼굴형 기준으로 왜 어울리는지 1문장",
    "featureTip": "이목구비 특징 기반 헤어 팁 1문장 (특징 없으면 null)",
    "coachComment": "헤어 중심 전체 조언 2-3문장"
  },
  { "type": "recommend", "rank": 2, "cardType": "hair", "mood": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "hair", "mood": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "hair",
    "mood": "피해야 할 헤어스타일",
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
  { "type": "recommend", "rank": 2, "cardType": "makeup", "mood": "...", "emoji": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "makeup", "mood": "...", "emoji": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "makeup",
    "mood": "피해야 할 메이크업",
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
  { "type": "recommend", "rank": 2, "cardType": "total", "mood": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  { "type": "recommend", "rank": 3, "cardType": "total", "mood": "...", "emoji": "...", "hair": "...", "bangs": "...", "hairReason": "...", "baseSkin": "...", "makeup": { "shading": "...", "shadingReason": "...", "highlight": "...", "highlightReason": "...", "blush": "...", "blushReason": "...", "eyebrow": "...", "eyebrowReason": "...", "lip": "...", "lipReason": "...", "eyeshadow": "...", "eyeshadowReason": "...", "eyeliner": "...", "eyelinerReason": "..." }, "featureTip": "...", "coachComment": "..." },
  {
    "type": "avoid",
    "cardType": "total",
    "mood": "피해야 할 스타일",
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
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 | 판정 어려움 중 하나",
  "features": ["확실히 보이는 특징만, 0개도 가능"]
}

## 분석 원칙 (반드시 준수)
- **확실한 것만 포함**: 사진을 보고 즉시 "이건 확실하다"고 판단되는 것만 포함하세요.
- **애매하면 제외**: "아마도", "~인 것 같다", "~일 수도 있다" 수준이면 포함하지 마세요.
- **억지로 채우지 말 것**: 목록을 채우기 위해 불확실한 항목을 넣는 것은 잘못된 분석입니다. 빈 배열([])도 정답입니다.

---

## 얼굴형 판단 기준

### 분류 우선순위 (위에서부터 순서대로 검사)
1. **사각형/땅콩형 검사 — 턱 모서리(gonial 코너) 각짐 우선**
   - 턱 좌우 모서리가 직선적으로 각져 있으면 우선 사각/땅콩 후보
   - 턱끝의 모양(V/U)이나 얼굴 길이는 무관 — 짧은 사각, 긴 사각, V턱 사각 모두 포함
   - 광대까지 발달했으면 땅콩형, 광대 부드러우면 사각형
2. **하트형/다이아몬드형 검사 — 광대가 가장 넓은가**
   - 광대 폭이 이마·턱보다 명확히 넓으면 후보
   - 이마도 넓으면 하트형, 이마·턱 모두 좁으면 다이아몬드형
3. **긴형 검사 — 세로 길이 압도적**
   - 위에 해당 안 되고 세로/가로 비율이 1.4 이상으로 명확히 길면 긴형
4. **계란형/둥근형** (위 모두 해당 안 됨)
   - 골격 특징 약하고 부드러우면 — 길이 적당하면 계란형, 둥근편이면 둥근형

### 형별 정의
- 계란형: 이마가 약간 넓고 턱으로 갈수록 자연스럽게 좁아지는 형태. **gonial 코너 부드러움**.
- 둥근형: 얼굴 폭과 길이가 비슷하고 전체 윤곽이 부드럽고 볼살이 있는 형태. gonial 코너 부드러움.
- 사각형: **턱 좌우 모서리(gonial 코너)가 직선적으로 각져 있는 형태**. 광대 아래에서 턱 모서리까지 이어지는 라인이 곡선이 아닌 직선적·모서리가 뚜렷함. 턱끝은 V/U/사각 어느 형태든 무관. 얼굴 길이도 무관 (짧은 사각/긴 사각 모두 포함).
- 하트형: 이마·광대가 넓고 턱 끝이 뾰족하게 좁아지는 형태. gonial 부드러움.
- 긴형: 얼굴 세로 길이가 가로 폭보다 확연히 긴 형태. gonial 부드러움 (각지면 사각형으로).
- 다이아몬드형: 옆광대가 가장 넓고 이마와 턱이 모두 좁은 형태. gonial 부드러움.
- 땅콩형: **gonial 코너 각짐 + 광대도 발달**. 볼이 살짝 패여 라인이 울퉁불퉁.

### 경계형 처리 — "판정 어려움"
두 얼굴형 사이 경계(예: 다이아몬드/하트, 땅콩/사각, 계란/긴)에서 어느 쪽으로도 80% 이상 확신할 수 없다면 "판정 어려움"으로 응답하세요.
이 값은 사용자가 어느 한 쪽으로 잘못 안내받는 것보다 낫다고 판단될 때만 사용하세요. 남발하지 마세요.

---

## features 판단 기준
아래 목록에서 **사진에서 명확하게 눈에 띄는 특징만** 골라 정확히 이 텍스트 그대로 사용하세요.
확신도 80% 미만이면 포함하지 마세요. 0개~3개가 적절하며, 4개 이상이면 다시 검토하세요.

선택 가능 목록:
"눈 간격 넓음", "눈 간격 좁음", "코 낮음", "코 높음", "코 큼",
"이마 넓음", "이마 좁음", "눈 작음", "광대 넓음", "입술 얇음",
"입술 두꺼움", "중안부 긴 유형", "중안부 짧은 유형", "눈두덩이 좁음",
"눈두덩이 넓음", "관자놀이 여백 넓음", "사각턱", "돌출입", "목 짧음",
"무쌍", "속쌍꺼풀", "눈꼬리 처짐", "눈꼬리 올라감", "눈꼬리 막힘",
"눈두덩이 살 두꺼움", "눈두덩이 살 얇음", "둥근 눈", "아몬드 눈", "긴 눈",
"삼백안", "인중 긺", "인중 짧음", "무턱", "주걱턱", "콘헤드",
"어깨 너비 넓음", "승모근 발달\""""
