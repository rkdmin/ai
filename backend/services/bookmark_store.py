"""bookmarks 저장소 (plan 0009 P5 · F10). Supabase REST + 미설정 시 메모리. (owner, content) 가 키라 중복 저장이 없다."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from services import supabase_service as sb

_memory: dict[tuple[str, str], dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _rest(method: str, *, params: dict | None = None, json: Any = None, prefer: str | None = None) -> Any:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.request(method, f"{sb.SUPABASE_URL}/rest/v1/bookmarks", headers=sb._rest_headers(prefer), params=params, json=json)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="저장한 스타일 요청에 실패했습니다.")
    return resp.json() if resp.content else None


async def list_for(owner_id: str, kind: str | None = None) -> list[dict[str, Any]]:
    if not sb.configured():
        rows = [r for (o, _), r in _memory.items() if o == owner_id]
    else:
        rows = await _rest("GET", params={"owner_id": f"eq.{owner_id}", "select": "*", "order": "created_at.desc"})
    if kind and kind != "all":
        rows = [r for r in rows if r.get("content_kind") == kind]
    return sorted(rows, key=lambda r: r.get("created_at") or "", reverse=True)


async def upsert(owner_id: str, content_id: str, kind: str) -> dict[str, Any]:
    row = {"owner_id": owner_id, "content_id": content_id, "content_kind": kind}
    if not sb.configured():
        _memory.setdefault((owner_id, content_id), {**row, "created_at": _now()})
        return _memory[(owner_id, content_id)]
    rows = await _rest("POST", json=row, prefer="return=representation,resolution=merge-duplicates")
    return rows[0] if rows else row


async def delete(owner_id: str, content_id: str) -> bool:
    if not sb.configured():
        return _memory.pop((owner_id, content_id), None) is not None
    rows = await _rest("DELETE", params={"owner_id": f"eq.{owner_id}", "content_id": f"eq.{content_id}"}, prefer="return=representation")
    return bool(rows)


def reset_memory() -> None:
    _memory.clear()
