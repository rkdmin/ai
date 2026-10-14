"""만료 사진 정리 (plan 0009 F12). Storage·REST 는 mock."""
from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from services import cleanup_service, supabase_service  # noqa: E402


def test_object_path_parsing_only_matches_our_bucket(monkeypatch):
    monkeypatch.setattr(supabase_service, "SUPABASE_URL", "https://x.supabase.co")
    monkeypatch.setattr(supabase_service, "SUPABASE_PHOTO_BUCKET", "analysis-photos")
    url = "https://x.supabase.co/storage/v1/object/public/analysis-photos/analyses/u1/a.jpg"
    assert cleanup_service.object_path_from_public_url(url) == "analyses/u1/a.jpg"
    assert cleanup_service.object_path_from_public_url("https://other.cdn/pic.jpg") is None
    assert cleanup_service.object_path_from_public_url(None) is None


def test_cleanup_without_supabase_reports_nothing_to_do():
    with patch("services.supabase_service.configured", return_value=False):
        import asyncio

        report = asyncio.run(cleanup_service.cleanup_expired())
    assert report["frontPhotosDeleted"] == 0 and report["generatedPhotosDeleted"] == 0 and report["errors"]


def test_admin_endpoint_is_hidden_without_token_and_guarded_with_it(monkeypatch):
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    with TestClient(app) as client:
        assert client.post("/api/admin/cleanup-expired").status_code == 404
    monkeypatch.setenv("ADMIN_TOKEN", "s3cret")
    report = {"frontPhotosDeleted": 2, "generatedPhotosDeleted": 1, "errors": [], "ranAt": "now"}
    with patch("services.cleanup_service.cleanup_expired", new=AsyncMock(return_value=report)):
        with TestClient(app) as client:
            bad = client.post("/api/admin/cleanup-expired", headers={"X-Admin-Token": "nope"})
            ok = client.post("/api/admin/cleanup-expired", headers={"X-Admin-Token": "s3cret"})
    assert bad.status_code == 401 and ok.status_code == 200 and ok.json()["frontPhotosDeleted"] == 2
