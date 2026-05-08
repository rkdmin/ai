"""
백엔드 라우트 통합 테스트 (Gemini 호출은 stub — 토큰 소비 0).

검증 항목:
1. /api/health 200
2. /api/analyze — Gemini 응답 → AnalyzeResponse 스키마 통과
3. /api/cards/hair, /api/cards/makeup, /api/cards/total — 스키마 통과
4. 응답 카드 필드가 프론트 mappers 가 기대하는 키(type/rank/cardType/mood/moodLabel/hair/...)를 모두 포함

이 파일은 venv 의 pytest 로 실행:
  cd backend && .venv/Scripts/python.exe -m pytest test_integration.py -v
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

# backend/ 자체를 import path 로 (services, routes 가 sibling).
sys.path.insert(0, str(Path(__file__).parent))

# Gemini 키 없어도 import 가 깨지지 않도록 더미.
os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


# ─── Gemini stub 응답 ──────────────────────────────────────────────


def _gemini_response(text: str) -> dict:
    """Gemini API 의 generateContent 응답 모양을 흉내."""
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


_ANALYZE_TEXT = json.dumps(
    {
        "faceType": "계란형",
        "features": ["균형잡힌 비율", "부드러운 눈매"],
        "moodArchetype": ["ROMANTIC", "CLEAN", "SOFT"],
    }
)

_HAIR_CARDS_TEXT = json.dumps(
    [
        {
            "type": "recommend", "rank": 1, "cardType": "hair",
            "mood": "청순 내추럴", "moodLabel": "ROMANTIC · 우아한 분위기", "emoji": "🌸",
            "hair": "쿠션 단발", "bangs": "시스루뱅",
            "hairReason": "계란형에 자연스럽게 어울려요.",
            "featureTip": "부드러운 눈매를 강조하기 위해 C컬을 활용",
            "coachComment": "쿠션 단발은 둥근 인상을 살리면서 우아한 무드를 더해줍니다.",
        },
        {
            "type": "recommend", "rank": 2, "cardType": "hair",
            "mood": "시크 레이어드", "moodLabel": "CLEAN · 도시적 분위기", "emoji": "✨",
            "hair": "레이어드 컷", "bangs": "사이드뱅",
            "hairReason": "사이드 레이어가 옆 라인을 정돈해 줍니다.",
            "featureTip": None,
            "coachComment": "레이어드 컷은 세련된 인상을 줍니다.",
        },
        {
            "type": "recommend", "rank": 3, "cardType": "hair",
            "mood": "오피스 단정", "moodLabel": "CLASSIC · 단정한 분위기", "emoji": "💼",
            "hair": "단발 외컬", "bangs": "없음",
            "hairReason": "깔끔한 선이 단정한 인상을 줍니다.",
            "featureTip": None,
            "coachComment": "외컬 단발은 정돈된 오피스 룩에 잘 맞아요.",
        },
        {
            "type": "avoid", "cardType": "hair",
            "mood": "피해야 할 헤어", "moodLabel": None, "emoji": "⚠️",
            "hair": "원랭스 롱 스트레이트", "bangs": None,
            "hairReason": "얼굴 폭이 더 넓어 보일 수 있어요.",
            "featureTip": None,
            "coachComment": "원랭스 롱은 둥근 얼굴이 더 강조될 수 있어 권하지 않아요.",
        },
    ]
)

_MAKEUP_CARDS_TEXT = json.dumps(
    [
        {
            "type": "recommend", "rank": 1, "cardType": "makeup",
            "mood": "생기 발랄", "moodLabel": "FRESH · 생기 발랄", "emoji": "🌸",
            "baseSkin": "Semi-Glow",
            "makeup": {
                "shading": "광대 아래 음영", "shadingReason": "입체감",
                "highlight": "앞광대 물광", "highlightReason": "생기",
                "blush": "피치", "blushReason": "혈색",
                "eyebrow": "라이트 브라운", "eyebrowReason": "투명",
                "lip": "코랄", "lipReason": "화사",
                "eyeshadow": "샴페인 골드", "eyeshadowReason": "트임",
                "eyeliner": "브라운 점막", "eyelinerReason": "맑음",
            },
            "featureTip": "눈 앞머리 강조",
            "coachComment": "코랄 + 피치 조합은 생기 있는 인상을 만들어요.",
        },
        {
            "type": "recommend", "rank": 2, "cardType": "makeup",
            "mood": "시크 글램", "moodLabel": "ELEGANT · 글램", "emoji": "✨",
            "baseSkin": "Glow",
            "makeup": {
                "shading": "광대 옆 음영", "shadingReason": "갸름",
                "highlight": "콧대", "highlightReason": "입체",
                "blush": "테라코타", "blushReason": "음영",
                "eyebrow": "세미 아치", "eyebrowReason": "러블리",
                "lip": "누드 오렌지", "lipReason": "또렷",
                "eyeshadow": "골드 쉬머", "eyeshadowReason": "포인트",
                "eyeliner": "꼬리 내림", "eyelinerReason": "강아지상",
            },
            "featureTip": "노즈 쉐딩 추가",
            "coachComment": "골드와 테라코타로 세련된 글램.",
        },
        {
            "type": "recommend", "rank": 3, "cardType": "makeup",
            "mood": "오피스 시크", "moodLabel": "CLASSIC · 단정", "emoji": "💼",
            "baseSkin": "Matte",
            "makeup": {
                "shading": "헤어라인", "shadingReason": "정돈",
                "highlight": "이마", "highlightReason": "맑음",
                "blush": "살구", "blushReason": "건강",
                "eyebrow": "내추럴 일자", "eyebrowReason": "단정",
                "lip": "로즈 베이지", "lipReason": "전문",
                "eyeshadow": "샴페인 베이지", "eyeshadowReason": "은은",
                "eyeliner": "브라운 얇은 라인", "eyelinerReason": "세련",
            },
            "featureTip": None,
            "coachComment": "차분한 베이지 톤 오피스 룩.",
        },
        {
            "type": "avoid", "cardType": "makeup",
            "mood": "피해야 할 메이크업", "moodLabel": None, "emoji": "⚠️",
            "baseSkin": None,
            "makeup": {
                "shading": "진한 그늘", "shadingReason": "어두움",
                "highlight": None, "highlightReason": None,
                "blush": "진한 로즈", "blushReason": "광대 부각",
                "eyebrow": None, "eyebrowReason": None,
                "lip": "다크 버건디", "lipReason": "무거움",
                "eyeshadow": None, "eyeshadowReason": None,
                "eyeliner": None, "eyelinerReason": None,
            },
            "featureTip": None,
            "coachComment": "다크 컬러는 얼굴을 무겁게 만들어요.",
        },
    ]
)


# ─── Fixtures ──────────────────────────────────────────────────────


def _patch_gemini(call_response_text: str):
    """gemini_service._call_gemini 를 stub. mediapipe 도 함께 stub해 정적 부팅."""
    return patch(
        "services.gemini_service._call_gemini",
        new=AsyncMock(return_value=_gemini_response(call_response_text)),
    )


def _patch_mediapipe():
    return patch("services.mediapipe_service.extract_face_ratios", return_value=None)


# ─── 테스트 ────────────────────────────────────────────────────────


def test_health():
    with TestClient(app) as client:
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


def test_analyze_returns_valid_schema():
    with _patch_mediapipe(), _patch_gemini(_ANALYZE_TEXT):
        with TestClient(app) as client:
            r = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})
    assert r.status_code == 200, r.text
    data = r.json()
    # AnalyzeResponse 스키마.
    assert data["faceType"] == "계란형"
    assert isinstance(data["features"], list)
    assert isinstance(data["moodArchetype"], list)
    assert len(data["moodArchetype"]) == 3


def test_cards_hair_returns_4_cards_with_required_fields():
    with _patch_gemini(_HAIR_CARDS_TEXT):
        with TestClient(app) as client:
            r = client.post(
                "/api/cards/hair",
                json={"faceType": "계란형", "personalColor": "spring_warm", "features": ["부드러운 눈매"]},
            )
    assert r.status_code == 200, r.text
    cards = r.json()
    assert isinstance(cards, list)
    assert len(cards) == 4

    # 프론트 mappers.mapHairCard 가 사용하는 필드들이 모두 들어있는지.
    required = ("type", "cardType", "mood", "hair")
    for c in cards:
        for k in required:
            assert k in c, f"missing {k} in {c}"
    # rank 는 recommend 만 있음.
    recs = [c for c in cards if c["type"] == "recommend"]
    avoids = [c for c in cards if c["type"] == "avoid"]
    assert len(recs) == 3
    assert len(avoids) == 1
    for c in recs:
        assert "rank" in c and 1 <= c["rank"] <= 3
        assert "moodLabel" in c
        assert "coachComment" in c


def test_cards_makeup_returns_makeup_substructure():
    with _patch_gemini(_MAKEUP_CARDS_TEXT):
        with TestClient(app) as client:
            r = client.post(
                "/api/cards/makeup",
                json={"faceType": "계란형", "personalColor": "spring_warm", "features": ["부드러운 눈매"]},
            )
    assert r.status_code == 200, r.text
    cards = r.json()
    assert len(cards) == 4
    for c in cards:
        assert c["cardType"] == "makeup"
        assert "makeup" in c
        # makeup 객체에 핵심 part 키 적어도 일부.
        if c["type"] == "recommend":
            for part in ("shading", "blush", "lip"):
                assert part in c["makeup"], f"missing {part} in {c['makeup']}"


def test_cards_request_schema_validation():
    """faceType 누락 시 422."""
    with TestClient(app) as client:
        r = client.post("/api/cards/hair", json={"personalColor": "spring_warm"})
    assert r.status_code == 422


def test_no_personality_reference_in_hair_cards():
    """퍼블리시티권 정책 — 응답에 인물 비교 표현이 없어야 한다."""
    with _patch_gemini(_HAIR_CARDS_TEXT):
        with TestClient(app) as client:
            r = client.post(
                "/api/cards/hair",
                json={"faceType": "계란형", "personalColor": None, "features": []},
            )
    raw = r.text
    forbidden = ["st 룩", "닮은꼴", "look-alike", "님 st", "celebrityMatch"]
    for w in forbidden:
        assert w not in raw, f"forbidden token found: {w}"
