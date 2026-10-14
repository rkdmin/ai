"""통합 Beauty Report 라우트·서비스 테스트 (plan 0009 P3 · F04). Gemini·Supabase 는 mock."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from services import report_store  # noqa: E402
from services.gemini_service import GeminiError  # noqa: E402

HAIR = {"overview": {"direction": "부드럽게"}, "styles": [{"rank": 1, "hair": "레이어드", "salonRequest": "턱선 단발"}], "avoid": {}, "salonGuide": "..."}
MAKEUP = {"overview": {"direction": "저대비 살리기"}, "focusParts": [], "looks": [{"rank": 1, "mood": "SOFT"}], "avoid": {}}
H = {"X-User-Id": "user-1"}


@pytest.fixture(autouse=True)
def _open_access(monkeypatch):
    monkeypatch.setenv("REPORT_ACCESS_MODE", "open")
    report_store.reset_memory()
    yield
    report_store.reset_memory()


def _patch_gen(hair=HAIR, makeup=MAKEUP):
    return (
        patch("services.gemini_service.generate_hair_report", new=AsyncMock(side_effect=hair if isinstance(hair, Exception) else None, return_value=None if isinstance(hair, Exception) else hair)),
        patch("services.gemini_service.generate_makeup_report", new=AsyncMock(side_effect=makeup if isinstance(makeup, Exception) else None, return_value=None if isinstance(makeup, Exception) else makeup)),
    )


def test_reports_require_login():
    with TestClient(app) as client:
        assert client.post("/api/reports", json={"analysisId": "a1"}).status_code == 401
        assert client.get("/api/reports").status_code == 401


def test_create_report_generates_both_tabs_and_is_idempotent():
    p1, p2 = _patch_gen()
    with p1 as gh, p2 as gm:
        with TestClient(app) as client:
            r1 = client.post("/api/reports", json={"analysisId": "a1"}, headers=H)
            r2 = client.post("/api/reports", json={"analysisId": "a1"}, headers=H)

    assert r1.status_code == 200, r1.text
    body = r1.json()
    assert body["status"] == "ready" and body["locked"] is False
    assert body["hair"] == HAIR and body["makeup"] == MAKEUP
    assert r2.json()["id"] == body["id"]  # 같은 분석 → 같은 리포트
    assert gh.await_count == 1 and gm.await_count == 1  # 재생성하지 않는다


def test_partial_failure_keeps_good_tab_and_retry_only_regenerates_failed():
    p1, p2 = _patch_gen(makeup=GeminiError("overloaded"))
    with p1, p2:
        with TestClient(app) as client:
            r = client.post("/api/reports", json={"analysisId": "a1"}, headers=H)
    assert r.json()["status"] == "partial_failed"
    assert r.json()["hair"] == HAIR and r.json()["makeup"] is None
    assert "overloaded" in r.json()["makeupError"]
    report_id = r.json()["id"]

    p1, p2 = _patch_gen()
    with p1 as gh, p2 as gm:
        with TestClient(app) as client:
            r = client.post(f"/api/reports/{report_id}/retry", headers=H)
    assert r.json()["status"] == "ready" and r.json()["makeup"] == MAKEUP
    assert gh.await_count == 0 and gm.await_count == 1  # 성공한 hair 는 건드리지 않는다


def test_entitlement_mode_blocks_creation_and_hides_body(monkeypatch):
    p1, p2 = _patch_gen()
    with p1, p2:
        with TestClient(app) as client:
            created = client.post("/api/reports", json={"analysisId": "a1"}, headers=H).json()
            monkeypatch.setenv("REPORT_ACCESS_MODE", "entitlement")
            blocked = client.post("/api/reports", json={"analysisId": "a2"}, headers=H)
            read = client.get(f"/api/reports/{created['id']}", headers=H)

    assert blocked.status_code == 403 and blocked.json()["code"] == "REPORT_ACCESS_REQUIRED"
    # 권한이 사라지면(환불 등) 본문은 내려가지 않는다 — 구매 전 전체 본문이 payload 에 없음
    assert read.status_code == 200
    assert read.json()["locked"] is True and read.json()["hair"] is None and read.json()["makeup"] is None
    assert read.json()["analysis"]["faceType"]  # 요약은 보인다


def test_other_users_report_is_not_found():
    p1, p2 = _patch_gen()
    with p1, p2:
        with TestClient(app) as client:
            created = client.post("/api/reports", json={"analysisId": "a1"}, headers=H).json()
            r = client.get(f"/api/reports/{created['id']}", headers={"X-User-Id": "user-2"})
    assert r.status_code == 404 and r.json()["code"] == "NOT_FOUND"


def test_report_formats_carry_figma_fields_and_ban_brands():
    from services.rag_service import REPORT_HAIR_FORMAT, REPORT_MAKEUP_FORMAT

    for key in ("overview", "length", "bangs", "volume", "layer", "styles", "salonRequest", "salonGuide", "alternative"):
        assert key in REPORT_HAIR_FORMAT, key
    for key in ("overview", "faceBalance", "focusParts", "evidence", "looks", "applyOrder", "productTypes"):
        assert key in REPORT_MAKEUP_FORMAT, key
    assert "브랜드" in REPORT_MAKEUP_FORMAT and "금지" in REPORT_MAKEUP_FORMAT


def test_makeup_report_drops_focus_parts_with_invented_evidence():
    """evidence 가 분석에 없는 항목이면 그 부위를 버린다 — 지어낸 근거를 유료 본문에 싣지 않는다."""
    import asyncio

    from services import gemini_service

    raw = {
        "overview": {"direction": "x", "faceBalance": "y"},
        "focusParts": [
            {"part": "EYE", "evidence": "아몬드 눈", "recommendation": "..."},
            {"part": "LIP", "evidence": "입술 두꺼움", "recommendation": "..."},   # 분석에 없음
        ],
        "looks": [{"rank": 1}, {"rank": 2}, {"rank": 3}],
        "avoid": {},
    }
    with patch("services.gemini_service._call_gemini", new=AsyncMock(return_value={})), \
         patch("services.gemini_service._extract_text", return_value="{}"), \
         patch("services.gemini_service._extract_json_obj", return_value=raw):
        out = asyncio.run(gemini_service.generate_makeup_report({"faceType": "계란형", "features": ["아몬드 눈"], "traits": ["저대비"]}))
    assert [fp["part"] for fp in out["focusParts"]] == ["EYE"]
