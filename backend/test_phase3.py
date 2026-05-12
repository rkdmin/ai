"""Phase 3 auth/history/storage route tests.

External Supabase and Gemini calls are mocked. These tests guard the wiring
between FastAPI dependencies, route handlers, and the Supabase service layer.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

from fastapi.testclient import TestClient  # noqa: E402

from services.gemini_service import GeminiError  # noqa: E402
from main import app  # noqa: E402


def test_history_requires_login():
    with TestClient(app) as client:
        r = client.get("/api/history")

    assert r.status_code == 401
    assert r.json()["detail"] == "로그인이 필요합니다."


def test_cors_allows_localhost_and_127_dev_origins():
    with TestClient(app) as client:
        for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
            r = client.options(
                "/api/analyze",
                headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
            )
            assert r.status_code == 200
            assert r.headers["access-control-allow-origin"] == origin


def test_history_list_returns_current_user_items():
    rows = [
        {
            "analysisId": "analysis-1",
            "faceType": "계란형",
            "personalColor": "spring_warm",
            "cardTypes": ["hair"],
            "createdAt": "2026-05-11T00:00:00+00:00",
            "photoExpired": False,
        }
    ]
    with patch("services.supabase_service.list_history", new=AsyncMock(return_value=rows)) as list_history:
        with TestClient(app) as client:
            r = client.get("/api/history", headers={"X-User-Id": "user-1"})

    assert r.status_code == 200, r.text
    assert r.json()[0]["analysisId"] == "analysis-1"
    list_history.assert_awaited_once_with("user-1", limit=5)


def test_analyze_logged_in_user_persists_analysis_and_returns_id():
    result = {"faceType": "계란형", "features": ["균형"], "moodArchetype": ["CLEAN"]}
    with (
        patch("services.mediapipe_service.extract_face_ratios", return_value={"jawRatio": 0.8}),
        patch("services.gemini_service.analyze_face", new=AsyncMock(return_value=result)),
        patch(
            "services.supabase_service.upload_image_data_url",
            new=AsyncMock(return_value=("https://cdn.example/front.jpg", "2026-08-09T00:00:00+00:00")),
        ) as upload,
        patch("services.supabase_service.insert_analysis", new=AsyncMock(return_value="analysis-1")) as insert,
    ):
        with TestClient(app) as client:
            r = client.post(
                "/api/analyze",
                headers={"X-User-Id": "user-1"},
                json={"frontImage": "data:image/jpeg;base64,xxx", "personalColor": "spring_warm"},
            )

    assert r.status_code == 200, r.text
    assert r.json()["analysisId"] == "analysis-1"
    upload.assert_awaited_once()
    insert.assert_awaited_once()
    assert insert.await_args.kwargs["user_id"] == "user-1"
    assert insert.await_args.kwargs["personal_color"] == "spring_warm"


def test_analyze_transient_gemini_error_returns_503():
    with (
        patch("services.mediapipe_service.extract_face_ratios", return_value=None),
        patch(
            "services.gemini_service.analyze_face",
            new=AsyncMock(side_effect=GeminiError("This model is currently experiencing high demand. Please try again later.")),
        ),
    ):
        with TestClient(app) as client:
            r = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 503
    assert "high demand" in r.json()["detail"]


def test_cards_logged_in_user_persists_generated_cards():
    cards = [{"type": "recommend", "rank": 1, "cardType": "hair", "mood": "CLEAN", "hair": "레이어드"}]
    with (
        patch("services.gemini_service.generate_hair_cards", new=AsyncMock(return_value=cards)),
        patch("services.supabase_service.insert_cards", new=AsyncMock()) as insert_cards,
    ):
        with TestClient(app) as client:
            r = client.post(
                "/api/cards/hair",
                headers={"X-User-Id": "user-1"},
                json={"analysisId": "analysis-1", "faceType": "계란형", "personalColor": "spring_warm", "features": []},
            )

    assert r.status_code == 200, r.text
    assert r.json() == cards
    insert_cards.assert_awaited_once_with(
        user_id="user-1",
        analysis_id="analysis-1",
        card_type="hair",
        card_data=cards,
    )


def test_photo_generate_returns_cached_image_without_gemini_call():
    with (
        patch(
            "services.supabase_service.get_generated_photo",
            new=AsyncMock(return_value={"storage_url": "https://cdn.example/generated.jpg"}),
        ),
        patch("services.gemini_service.generate_styled_photo", new=AsyncMock()) as generate,
    ):
        with TestClient(app) as client:
            r = client.post(
                "/api/photo/generate",
                headers={"X-User-Id": "user-1"},
                json={"analysisId": "analysis-1", "cardType": "hair", "card": {"hair": "레이어드"}},
            )

    assert r.status_code == 200, r.text
    assert r.json() == {"generatedImage": "https://cdn.example/generated.jpg", "cached": True}
    generate.assert_not_awaited()


def test_photo_generate_uploads_and_records_new_image():
    with (
        patch("services.supabase_service.get_generated_photo", new=AsyncMock(return_value=None)),
        patch("services.gemini_service.generate_styled_photo", new=AsyncMock(return_value="data:image/jpeg;base64,out")),
        patch(
            "services.supabase_service.upload_image_data_url",
            new=AsyncMock(return_value=("https://cdn.example/generated.jpg", "2026-06-10T00:00:00+00:00")),
        ),
        patch("services.supabase_service.insert_generated_photo", new=AsyncMock()) as insert_photo,
    ):
        with TestClient(app) as client:
            r = client.post(
                "/api/photo/generate",
                headers={"X-User-Id": "user-1"},
                json={
                    "analysisId": "analysis-1",
                    "cardType": "hair",
                    "card": {"hair": "레이어드"},
                    "frontImage": "data:image/jpeg;base64,xxx",
                },
            )

    assert r.status_code == 200, r.text
    assert r.json() == {"generatedImage": "data:image/jpeg;base64,out", "cached": False}
    insert_photo.assert_awaited_once_with("user-1", "analysis-1", "hair", "https://cdn.example/generated.jpg")
