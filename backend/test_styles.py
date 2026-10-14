"""STYLE 피드·상세·제품·북마크 (plan 0009 P5). 사전은 초안뿐이라 STYLE_INCLUDE_DRAFTS 로 켜서 테스트한다."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

os.environ.setdefault("GEMINI_API_KEY", "test-key")
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402
from services import bookmark_store, style_service  # noqa: E402

H = {"X-User-Id": "user-1"}


@pytest.fixture(autouse=True)
def _drafts(monkeypatch):
    monkeypatch.setenv("STYLE_INCLUDE_DRAFTS", "true")
    bookmark_store.reset_memory()
    yield
    bookmark_store.reset_memory()


def test_drafts_are_hidden_by_default(monkeypatch):
    monkeypatch.delenv("STYLE_INCLUDE_DRAFTS", raising=False)
    assert style_service.all_content() == []  # 운영 글이 없으면 피드가 비어야지, 초안이 나가면 안 된다
    assert style_service.all_products() == []
    with TestClient(app) as client:
        r = client.get("/api/styles?section=foryou&mood=SOFT")
    assert r.status_code == 200 and r.json()["items"] == [] and r.json()["personalized"] is False


def test_foryou_scores_by_primary_mood_then_traits_and_explains():
    with TestClient(app) as client:
        r = client.get("/api/styles?section=foryou&mood=SOFT&moods=SOFT,ROMANTIC,CLEAN&traits=저대비,곡선 윤곽&kind=makeup")
    body = r.json()
    assert body["personalized"] is True
    assert body["items"][0]["id"] == "c-soft-blush-5"  # SOFT+ROMANTIC+저대비+곡선 윤곽
    assert "SOFT 무드" in body["items"][0]["matchReasons"]
    assert all(i["kind"] == "makeup" for i in body["items"])


def test_foryou_without_match_falls_back_to_editorial_and_says_so():
    with TestClient(app) as client:
        r = client.get("/api/styles?section=foryou&mood=EDGY&kind=hair")
    body = r.json()
    assert body["personalized"] is False and body["label"] == "에디터 추천"
    assert body["items"] and all(i["kind"] == "hair" for i in body["items"])


def test_detail_usage_depends_on_mood_and_lists_related():
    with TestClient(app) as client:
        pre = client.get("/api/styles/c-soft-blush-5").json()
        post = client.get("/api/styles/c-soft-blush-5?mood=SOFT").json()
        missing = client.get("/api/styles/nope")
    assert pre["usage"] is None and pre["personalized"] is None
    assert post["usage"].startswith("앞볼") and post["personalized"]["point"]
    assert [c["id"] for c in post["relatedContents"]] == ["c-soft-eye-soft-edge"]
    assert post["relatedProducts"][0]["id"] == "p-blush-cream-01" and post["relatedProducts"][0]["affiliate"] is False
    assert missing.status_code == 404


def test_products_match_mood_traits_color_and_content_link():
    with TestClient(app) as client:
        a = client.get("/api/products/recommendations?mood=SHARP&traits=고대비&personalColor=겨울쿨").json()
        b = client.get("/api/products/recommendations?contentId=c-soft-blush-5").json()
        c = client.get("/api/products/recommendations?mood=SOFT&part=brow").json()
    assert a["personalized"] is True and a["items"][0]["id"] == "p-lip-tint-01" and "겨울쿨" in a["items"][0]["matchReasons"]
    assert b["source"] == "editorial_detail" and [p["id"] for p in b["items"]] == ["p-blush-cream-01"]
    assert c["personalized"] is False  # brow 에 SOFT 매칭 없음 → 과장하지 않고 폴백


def test_bookmarks_require_login_dedupe_filter_and_merge():
    with TestClient(app) as client:
        assert client.get("/api/bookmarks").status_code == 401
        assert client.put("/api/bookmarks/c-soft-blush-5", headers=H).json()["saved"] is True
        assert client.put("/api/bookmarks/c-soft-blush-5", headers=H).status_code == 200  # 중복 저장은 그대로
        assert client.put("/api/bookmarks/private-or-missing", headers=H).status_code == 404
        client.put("/api/bookmarks/c-layer-cut-by-face", headers=H)
        all_ = client.get("/api/bookmarks", headers=H).json()
        hair = client.get("/api/bookmarks?kind=hair", headers=H).json()
        merged = client.post("/api/bookmarks/merge", json={"contentIds": ["c-soft-blush-5", "c-sharp-lip", "c-sharp-lip", "ghost"]}, headers=H).json()
        removed = client.delete("/api/bookmarks/c-sharp-lip", headers=H).json()
        final = client.get("/api/bookmarks", headers=H).json()
    assert all_["count"] == 2 and hair["count"] == 1 and hair["items"][0]["contentId"] == "c-layer-cut-by-face"
    assert merged == {"merged": 2, "skipped": ["ghost"], "count": 3}
    assert removed["removed"] is True and final["count"] == 2
