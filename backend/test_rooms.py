"""Beauty Room·초대·참여·랭킹·인계 (plan 0009 P6). Supabase 미설정 → 메모리 저장소."""
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
from services import room_store  # noqa: E402

OWNER = {"X-User-Id": "owner-1"}
FRIEND_USER = {"X-User-Id": "friend-9"}
SOFT = {"primaryMood": "SOFT", "moodArchetype": ["SOFT", "ROMANTIC", "CLEAN"], "traits": ["곡선 윤곽", "저대비"], "moodTitle": "차분한", "email": "leak@x.y"}
SHARP = {"primaryMood": "SHARP", "moodArchetype": ["SHARP", "EDGY", "CLEAN"], "traits": ["직선 윤곽", "고대비"]}
CLEAN = {"primaryMood": "CLEAN", "moodArchetype": ["CLEAN", "CLASSIC", "ELEGANT"], "traits": ["곡선 윤곽"]}


@pytest.fixture(autouse=True)
def _reset():
    room_store.reset_memory()
    yield
    room_store.reset_memory()


def _room_and_invite(client):
    room = client.post("/api/rooms", json={"nickname": "민지", "profile": SOFT}, headers=OWNER).json()
    inv = client.post("/api/rooms/me/invites", headers=OWNER).json()
    return room, inv["token"]


def test_room_requires_login_and_is_one_per_user():
    with TestClient(app) as client:
        assert client.post("/api/rooms", json={}).status_code == 401
        r1 = client.post("/api/rooms", json={"nickname": "민지", "profile": SOFT}, headers=OWNER).json()
        r2 = client.post("/api/rooms", json={"nickname": "다른", "profile": SHARP}, headers=OWNER).json()
    assert r1["id"] == r2["id"] and r1["owner"]["nickname"] == "민지"
    assert "email" not in r1["owner"]  # 공개 요약만


def test_invite_public_dto_and_guest_join_ranking_dedupe():
    with TestClient(app) as client:
        _, token = _room_and_invite(client)
        pub = client.get(f"/api/invites/{token}").json()
        assert pub["state"] == "valid" and pub["owner"]["primaryMood"] == "SOFT" and pub["participantCount"] == 0
        assert set(pub["owner"]) == {"nickname", "primaryMood", "moodArchetype", "traits", "moodTitle"}

        j1 = client.post(f"/api/invites/{token}/join", json={"nickname": "지수", "clientKey": "dev-a", "profile": SHARP}).json()
        j2 = client.post(f"/api/invites/{token}/join", json={"nickname": "유나", "clientKey": "dev-b", "profile": CLEAN}).json()
        again = client.post(f"/api/invites/{token}/join", json={"nickname": "지수", "clientKey": "dev-a", "profile": CLEAN}).json()
        mine = client.get("/api/rooms/me", headers=OWNER).json()

    assert j1["chemistry"]["type"] == "SPARK" and j2["chemistry"]["type"] == "BALANCE"
    assert again["participantCount"] == 2  # 같은 친구 재참여 → 참여 수 그대로
    assert again["chemistry"] == j1["chemistry"]  # 참여 당시 snapshot 유지 (R17)
    assert mine["participantCount"] == 2
    scores = [p["chemistry"]["score"] for p in mine["participants"]]
    assert scores == sorted(scores, reverse=True) and [p["rank"] for p in mine["participants"]] == [1, 2]


def test_guest_join_needs_client_key_and_owner_cannot_join_own_room():
    with TestClient(app) as client:
        _, token = _room_and_invite(client)
        r = client.post(f"/api/invites/{token}/join", json={"nickname": "x", "profile": SHARP})
        assert r.status_code == 400 and r.json()["code"] == "INVITE_INVALID"
        r = client.post(f"/api/invites/{token}/join", json={"nickname": "me", "profile": SHARP}, headers=OWNER)
        assert r.status_code == 400 and "내 Room" in r.json()["detail"]


def test_revoked_or_unknown_invite_blocks_public_read_and_join():
    with TestClient(app) as client:
        _, token = _room_and_invite(client)
        assert client.get("/api/invites/nope").json()["state"] == "missing"
        client.post("/api/rooms/me/invites/revoke", headers=OWNER)
        pub = client.get(f"/api/invites/{token}").json()
        join = client.post(f"/api/invites/{token}/join", json={"nickname": "x", "clientKey": "k", "profile": SHARP})
    assert pub["state"] == "revoked" and pub["owner"] is None
    assert join.status_code == 400 and join.json()["code"] == "INVITE_INVALID"


def test_handoff_token_is_one_time_and_attaches_participant():
    with TestClient(app) as client:
        _, token = _room_and_invite(client)
        joined = client.post(f"/api/invites/{token}/join", json={"nickname": "지수", "clientKey": "dev-a", "profile": SHARP}).json()
        ht = joined["handoffToken"]
        first = client.post(f"/api/handoffs/{ht}/claim", headers=FRIEND_USER)
        second = client.post(f"/api/handoffs/{ht}/claim", headers=FRIEND_USER)
        anon = client.post(f"/api/handoffs/{ht}/claim")
    assert first.status_code == 200 and first.json()["profile"]["primaryMood"] == "SHARP" and first.json()["hasOwnRoom"] is False
    assert second.status_code == 400 and second.json()["code"] == "INVITE_INVALID"
    assert anon.status_code == 401
