"""
rooms / room_participants / invite_tokens / handoff_tokens 저장소 (plan 0009 P6).
Supabase 설정 시 REST(service role), 아니면 프로세스 메모리 (로컬·테스트). report_store 와 같은 구조다.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from services import supabase_service as sb

_rooms: dict[str, dict[str, Any]] = {}
_participants: dict[str, dict[str, Any]] = {}
_invites: dict[str, dict[str, Any]] = {}
_handoffs: dict[str, dict[str, Any]] = {}

INVITE_TTL = timedelta(days=7)
HANDOFF_TTL = timedelta(minutes=30)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _parse(value: Any) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


async def _rest(method: str, table: str, *, params: dict | None = None, json: Any = None, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.request(method, f"{sb.SUPABASE_URL}/rest/v1/{table}", headers=sb._rest_headers(prefer), params=params, json=json)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"{table} 요청에 실패했습니다.")
    return resp.json() if resp.content else None


# ── rooms ─────────────────────────────────────────────────────────


async def get_active_room(owner_id: str) -> dict[str, Any] | None:
    if not sb.configured():
        return next((r for r in _rooms.values() if r["owner_id"] == owner_id and r["active"]), None)
    rows = await _rest("GET", "rooms", params={"owner_id": f"eq.{owner_id}", "active": "eq.true", "select": "*", "limit": "1"})
    return rows[0] if rows else None


async def create_room(owner_id: str, nickname: str, snapshot: dict[str, Any], analysis_id: str | None, rule_version: int) -> dict[str, Any]:
    row = {"owner_id": owner_id, "owner_nickname": nickname, "owner_snapshot": snapshot, "analysis_id": analysis_id, "rule_version": rule_version, "active": True}
    if not sb.configured():
        row.update({"id": str(uuid.uuid4()), "created_at": _iso(_now())})
        _rooms[row["id"]] = row
        return row
    return (await _rest("POST", "rooms", json=row, prefer="return=representation"))[0]


async def get_room(room_id: str) -> dict[str, Any] | None:
    if not sb.configured():
        return _rooms.get(room_id)
    rows = await _rest("GET", "rooms", params={"id": f"eq.{room_id}", "select": "*", "limit": "1"})
    return rows[0] if rows else None


async def deactivate_room(room_id: str, owner_id: str) -> None:
    if not sb.configured():
        room = _rooms.get(room_id)
        if room and room["owner_id"] == owner_id:
            room["active"] = False
        return
    await _rest("PATCH", "rooms", params={"id": f"eq.{room_id}", "owner_id": f"eq.{owner_id}"}, json={"active": False})


# ── participants ──────────────────────────────────────────────────


async def list_participants(room_id: str) -> list[dict[str, Any]]:
    if not sb.configured():
        rows = [p for p in _participants.values() if p["room_id"] == room_id]
        return sorted(rows, key=lambda p: p["joined_at"])
    return await _rest("GET", "room_participants", params={"room_id": f"eq.{room_id}", "select": "*", "order": "joined_at.asc"})


async def find_participant(room_id: str, *, participant_id: str | None, client_key: str | None) -> dict[str, Any] | None:
    for p in await list_participants(room_id):
        if participant_id and p.get("participant_id") == participant_id:
            return p
        if client_key and p.get("client_key") == client_key:
            return p
    return None


async def add_participant(room_id: str, *, participant_id: str | None, client_key: str | None, nickname: str, snapshot: dict[str, Any], chemistry: dict[str, Any]) -> dict[str, Any]:
    row = {"room_id": room_id, "participant_id": participant_id, "client_key": client_key, "nickname": nickname, "profile_snapshot": snapshot, "chemistry": chemistry}
    if not sb.configured():
        row.update({"id": str(uuid.uuid4()), "joined_at": _iso(_now())})
        _participants[row["id"]] = row
        return row
    return (await _rest("POST", "room_participants", json=row, prefer="return=representation"))[0]


async def attach_participant_user(participant_row_id: str, user_id: str) -> None:
    if not sb.configured():
        if participant_row_id in _participants:
            _participants[participant_row_id]["participant_id"] = user_id
        return
    await _rest("PATCH", "room_participants", params={"id": f"eq.{participant_row_id}"}, json={"participant_id": user_id})


# ── invites ───────────────────────────────────────────────────────


async def create_invite(room_id: str) -> dict[str, Any]:
    row = {"token": secrets.token_urlsafe(24), "room_id": room_id, "expires_at": _iso(_now() + INVITE_TTL), "revoked_at": None}
    if not sb.configured():
        row["created_at"] = _iso(_now())
        _invites[row["token"]] = row
        return row
    return (await _rest("POST", "invite_tokens", json=row, prefer="return=representation"))[0]


async def get_invite(token: str) -> dict[str, Any] | None:
    if not sb.configured():
        return _invites.get(token)
    rows = await _rest("GET", "invite_tokens", params={"token": f"eq.{token}", "select": "*", "limit": "1"})
    return rows[0] if rows else None


def invite_state(invite: dict[str, Any] | None) -> str:
    """valid | expired | revoked | missing"""
    if not invite:
        return "missing"
    if invite.get("revoked_at"):
        return "revoked"
    exp = _parse(invite.get("expires_at"))
    return "expired" if exp and exp < _now() else "valid"


async def revoke_invites(room_id: str) -> int:
    now = _iso(_now())
    if not sb.configured():
        n = 0
        for inv in _invites.values():
            if inv["room_id"] == room_id and not inv.get("revoked_at"):
                inv["revoked_at"] = now
                n += 1
        return n
    rows = await _rest("PATCH", "invite_tokens", params={"room_id": f"eq.{room_id}", "revoked_at": "is.null"}, json={"revoked_at": now}, prefer="return=representation")
    return len(rows or [])


# ── handoff ───────────────────────────────────────────────────────


async def create_handoff(participant_row_id: str) -> dict[str, Any]:
    row = {"token": secrets.token_urlsafe(24), "participant_id": participant_row_id, "expires_at": _iso(_now() + HANDOFF_TTL), "consumed_at": None}
    if not sb.configured():
        _handoffs[row["token"]] = row
        return row
    return (await _rest("POST", "handoff_tokens", json=row, prefer="return=representation"))[0]


async def consume_handoff(token: str) -> dict[str, Any] | None:
    """유효하면 소모 표시 후 행을 돌려준다. 만료·재사용·없음이면 None."""
    if not sb.configured():
        row = _handoffs.get(token)
        if not row or row.get("consumed_at") or (_parse(row["expires_at"]) or _now()) < _now():
            return None
        row["consumed_at"] = _iso(_now())
        return row
    rows = await _rest("GET", "handoff_tokens", params={"token": f"eq.{token}", "select": "*", "limit": "1"})
    row = rows[0] if rows else None
    if not row or row.get("consumed_at") or (_parse(row["expires_at"]) or _now()) < _now():
        return None
    await _rest("PATCH", "handoff_tokens", params={"token": f"eq.{token}", "consumed_at": "is.null"}, json={"consumed_at": _iso(_now())})
    return row


async def get_participant(participant_row_id: str) -> dict[str, Any] | None:
    if not sb.configured():
        return _participants.get(participant_row_id)
    rows = await _rest("GET", "room_participants", params={"id": f"eq.{participant_row_id}", "select": "*", "limit": "1"})
    return rows[0] if rows else None


def reset_memory() -> None:
    _rooms.clear(); _participants.clear(); _invites.clear(); _handoffs.clear()
