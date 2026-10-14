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

from services.gemini_service import GeminiError, GeminiRejected  # noqa: E402
from services.mediapipe_service import PhotoCheck  # noqa: E402
from main import app  # noqa: E402


def _ok_check(ratios=None) -> PhotoCheck:
    """얼굴 1개·충분히 큼 — 분석에 넘겨도 되는 사진."""
    return PhotoCheck(True, 1, True, ratios or {"jawRatio": 0.8}, None, None)


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
        patch("services.mediapipe_service.inspect_image", return_value=_ok_check()),
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
    # 저장본과 응답이 같은 모양 버전을 갖는다 (plan 0009 P1 · D04)
    from models.schemas import ANALYSIS_SCHEMA_VERSION

    assert r.json()["schemaVersion"] == ANALYSIS_SCHEMA_VERSION
    assert insert.await_args.kwargs["result"]["schemaVersion"] == ANALYSIS_SCHEMA_VERSION


def test_analysis_from_row_v2_restores_mood_from_result_json():
    from services.supabase_service import analysis_from_row

    row = {
        "id": "analysis-2",
        "face_type": "둥근형",
        "features": ["눈 간격 넓음"],
        "face_ratios": {"jawRatio": 0.9},
        "mood_archetype": ["SOFT", "ROMANTIC", "FRESH"],
        "schema_version": 2,
        "result": {
            "faceType": "둥근형",
            "features": ["눈 간격 넓음"],
            "moodArchetype": ["SOFT", "ROMANTIC", "FRESH"],
            "schemaVersion": 2,
        },
    }
    a = analysis_from_row(row)
    assert a["moodArchetype"] == ["SOFT", "ROMANTIC", "FRESH"]  # v2 가 저장한 무드는 복원된다
    assert a["faceRatios"] == {"jawRatio": 0.9}
    assert a["analysisId"] == "analysis-2"
    assert a["schemaVersion"] == 2
    assert a["legacy"] is True  # v3 의 primaryMood·traits 가 없다. 지어내지 않고 legacy 로 표시
    assert "primaryMood" not in a and "traits" not in a


def test_analysis_from_row_current_version_is_not_legacy():
    from models.schemas import ANALYSIS_SCHEMA_VERSION
    from services.supabase_service import analysis_from_row

    stored = {
        "faceType": "계란형", "features": [], "moodArchetype": ["CLEAN", "ELEGANT", "CLASSIC"],
        "primaryMood": "ELEGANT", "moodTitle": "우아하고 단정한 이미지", "traits": ["저대비"],
        "schemaVersion": ANALYSIS_SCHEMA_VERSION,
    }
    a = analysis_from_row({"id": "a3", "face_type": "계란형", "schema_version": ANALYSIS_SCHEMA_VERSION, "result": stored})
    assert a["legacy"] is False
    assert a["primaryMood"] == "ELEGANT" and a["traits"] == ["저대비"]


def test_analysis_from_row_v1_is_legacy_and_does_not_invent_mood():
    from services.supabase_service import analysis_from_row

    # 2026-10 이전 행: result 없음, mood_archetype 컬럼 자체가 없을 수도 있다
    row = {"id": "analysis-1", "face_type": "계란형", "features": ["균형"], "face_ratios": None}
    a = analysis_from_row(row)
    assert a["faceType"] == "계란형"
    assert a["moodArchetype"] == []  # 얼굴형 선호 무드로 채우지 않는다
    assert a["schemaVersion"] == 1
    assert a["legacy"] is True


def test_analysis_result_payload_strips_diagnostic_fields():
    from services.supabase_service import analysis_result_payload

    result = {
        "faceType": "계란형",
        "features": [],
        "moodArchetype": ["CLEAN", "ELEGANT", "CLASSIC"],
        "faceRatios": {"jawRatio": 0.8},
        "faceTypeReason": {"decidedAt": 4},
        "analysisId": "x",
        "schemaVersion": 2,
    }
    stored = analysis_result_payload(result)
    assert "faceRatios" not in stored and "faceTypeReason" not in stored and "analysisId" not in stored
    assert stored["moodArchetype"] == ["CLEAN", "ELEGANT", "CLASSIC"]


def test_history_detail_uses_legacy_adapter():
    row = {
        "id": "analysis-1",
        "face_type": "계란형",
        "face_ratios": None,
        "personal_color": None,
        "features": ["균형"],
        "created_at": "2026-05-11T00:00:00+00:00",
        "photo_expires_at": None,
        "front_image_url": None,
        "cards": [],
        "generated_photos": [],
    }
    with patch("services.supabase_service._get_analysis", new=AsyncMock(return_value=row)):
        with TestClient(app) as client:
            r = client.get("/api/history/analysis-1", headers={"X-User-Id": "user-1"})

    assert r.status_code == 200, r.text
    analysis = r.json()["analysis"]
    assert analysis["legacy"] is True
    assert analysis["moodArchetype"] == []
    assert analysis["schemaVersion"] == 1


def test_analyze_transient_gemini_error_returns_503():
    with (
        # 얼굴은 정상 검출된 상태여야 Gemini 까지 도달한다 (미검출이면 400 으로 먼저 끊긴다).
        patch("services.mediapipe_service.inspect_image", return_value=_ok_check()),
        patch(
            "services.gemini_service.analyze_face",
            new=AsyncMock(side_effect=GeminiError("This model is currently experiencing high demand. Please try again later.")),
        ),
    ):
        with TestClient(app) as client:
            r = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 503
    assert "high demand" in r.json()["detail"]
    assert r.json()["code"] == "AI_UNAVAILABLE"


def test_analyze_multiple_faces_is_rejected_before_gemini_with_code():
    check = PhotoCheck(True, 2, None, None, "MULTIPLE_FACES", "사진에 얼굴이 여러 개 보여요.")
    with (
        patch("services.mediapipe_service.inspect_image", return_value=check),
        patch("services.gemini_service.analyze_face", new=AsyncMock()) as gemini,
    ):
        with TestClient(app) as client:
            r = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 400
    assert r.json()["code"] == "MULTIPLE_FACES"
    assert "여러 개" in r.json()["detail"]
    gemini.assert_not_awaited()  # 무료 게이트가 유료 호출을 막는다


def test_analyze_model_rejection_maps_to_unsupported_photo():
    with (
        patch("services.mediapipe_service.inspect_image", return_value=_ok_check()),
        patch("services.gemini_service.analyze_face", new=AsyncMock(side_effect=GeminiRejected("일러스트로 보입니다."))),
    ):
        with TestClient(app) as client:
            r = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 400
    assert r.json()["code"] == "UNSUPPORTED_PHOTO"
    assert r.json()["detail"] == "일러스트로 보입니다."


def test_photos_validate_returns_checks_without_gemini():
    with (
        patch("services.mediapipe_service.inspect_image", return_value=_ok_check()),
        patch("services.gemini_service.analyze_face", new=AsyncMock()) as gemini,
    ):
        with TestClient(app) as client:
            r = client.post("/api/photos/validate", json={"image": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True and body["code"] is None and body["faceCount"] == 1
    assert body["checks"] == {"imageDecoded": True, "faceDetected": True, "singleFace": True, "faceLargeEnough": True}
    gemini.assert_not_awaited()


def test_photos_validate_reports_no_face_as_data_not_error():
    check = PhotoCheck(True, 0, None, None, "NO_FACE", "얼굴을 찾을 수 없어요.")
    with patch("services.mediapipe_service.inspect_image", return_value=check):
        with TestClient(app) as client:
            r = client.post("/api/photos/validate", json={"image": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 200  # 검사 결과는 200 으로 데이터로 준다. 분석 실패가 아니다
    body = r.json()
    assert body["ok"] is False and body["code"] == "NO_FACE"
    assert body["checks"]["faceDetected"] is False


def test_rate_limit_error_carries_code(monkeypatch):
    from middleware import rate_limit

    monkeypatch.delenv("RATE_LIMIT_DISABLED", raising=False)
    monkeypatch.setitem(rate_limit.LIMITS, "validate", {"guest": 0, "user": 0})
    with patch("services.mediapipe_service.inspect_image", return_value=_ok_check()):
        with TestClient(app) as client:
            r = client.post("/api/photos/validate", json={"image": "data:image/jpeg;base64,xxx"})

    assert r.status_code == 429
    assert r.json()["code"] == "RATE_LIMITED"


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


# ─── 계정 삭제 · 보관 정책 (plan 0009 P1, F12 선행) ─────────────────


def test_account_delete_requires_login():
    with TestClient(app) as client:
        r = client.delete("/api/account")
    assert r.status_code == 401


def test_account_delete_calls_service_and_reports_partial_failure():
    report = {"storageDeleted": 3, "analysesDeleted": True, "authUserDeleted": False, "errors": ["auth: 사용자 삭제 실패 (500)"]}
    with patch("services.supabase_service.delete_user_data", new=AsyncMock(return_value=report)) as svc:
        with TestClient(app) as client:
            r = client.delete("/api/account", headers={"X-User-Id": "user-1"})

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is False and body["storageDeleted"] == 3 and body["authUserDeleted"] is False
    svc.assert_awaited_once_with("user-1")


def test_account_policy_exposes_retention_days():
    with TestClient(app) as client:
        r = client.get("/api/account/policy")
    assert r.status_code == 200
    body = r.json()
    assert body["photoRetentionDays"] >= 1 and body["guestPhotoStored"] is False


def test_analyze_returns_photo_policy_for_user_and_guest():
    result = {"faceType": "계란형", "features": [], "moodArchetype": ["CLEAN"]}
    with (
        patch("services.mediapipe_service.inspect_image", return_value=_ok_check()),
        patch("services.gemini_service.analyze_face", new=AsyncMock(return_value=dict(result))),
        patch(
            "services.supabase_service.upload_image_data_url",
            new=AsyncMock(return_value=("https://cdn.example/front.jpg", "2026-08-09T00:00:00+00:00")),
        ),
        patch("services.supabase_service.insert_analysis", new=AsyncMock(return_value="analysis-1")),
    ):
        with TestClient(app) as client:
            user = client.post("/api/analyze", headers={"X-User-Id": "user-1"}, json={"frontImage": "data:image/jpeg;base64,xxx"})
            guest = client.post("/api/analyze", json={"frontImage": "data:image/jpeg;base64,xxx"})

    assert user.json()["photoExpiresAt"] == "2026-08-09T00:00:00+00:00"
    assert user.json()["photoRetentionDays"] >= 1
    assert guest.json()["photoExpiresAt"] is None  # 게스트 사진은 서버에 남지 않는다


# ─── D07 샘플 fixture 가 실제 응답 계약과 같은 모양인지 (plan 0009 P2) ─────


def test_sample_result_fixture_matches_analyze_contract():
    """src/data/sample-result.json 은 홈 '결과 예시 보기' 용 고정 샘플이다.
    응답 스키마를 통과하고, 정합성 필터를 거쳐도 바뀌지 않아야 한다 (바뀌면 fixture 가 규칙을 어긴 것)."""
    import json
    from copy import deepcopy

    from models.schemas import ANALYSIS_SCHEMA_VERSION, AnalyzeResponse
    from services.rag_service import TRAIT_LABELS, free_directions, mood_allowed, sanitize_analysis

    fixture = json.loads((Path(__file__).parent.parent / "src/data/sample-result.json").read_text(encoding="utf-8"))
    fixture.pop("_comment", None)
    assert fixture.pop("isSample") is True
    assert fixture["schemaVersion"] == ANALYSIS_SCHEMA_VERSION

    AnalyzeResponse(**fixture)  # 계약 통과
    cleaned = sanitize_analysis(deepcopy(fixture))
    for key in ("faceType", "features", "moodArchetype", "primaryMood", "moodTitle", "traits"):
        assert cleaned[key] == fixture[key], key
    assert fixture["primaryMood"] in mood_allowed(fixture["faceType"])
    assert all(t in TRAIT_LABELS for t in fixture["traits"])
    # 방향은 RAG 의 실제 출력과 같아야 한다 — RAG 가 바뀌면 fixture 도 갱신한다
    assert free_directions(fixture) == {"hairDirection": fixture["hairDirection"], "makeupDirection": fixture["makeupDirection"]}
