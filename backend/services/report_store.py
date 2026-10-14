"""
reports 테이블 저장소 (plan 0009 P3 · F04).

Supabase 가 설정돼 있으면 REST, 아니면 **프로세스 메모리** — 로컬 개발·테스트에서 결제 없이 흐름을 돌리기 위한 것이다.
메모리 저장소는 서버를 재시작하면 사라진다. 운영은 반드시 Supabase 다.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from services import supabase_service as sb

_memory: dict[str, dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def insert(owner_id: str, analysis_id: str, snapshot: dict[str, Any], schema_version: int) -> dict[str, Any]:
    row = {
        "owner_id": owner_id,
        "analysis_id": analysis_id,
        "analysis_snapshot": snapshot,
        "schema_version": schema_version,
        "status": "not_started",
        "hair": None,
        "makeup": None,
        "hair_error": None,
        "makeup_error": None,
    }
    if not sb.configured():
        row.update({"id": str(uuid.uuid4()), "created_at": _now(), "updated_at": _now()})
        _memory[row["id"]] = row
        return row
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(f"{sb.SUPABASE_URL}/rest/v1/reports", headers=sb._rest_headers("return=representation"), json=row)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="리포트 생성에 실패했습니다.")
    return resp.json()[0]


async def update(report_id: str, owner_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    patch = {**patch, "updated_at": _now()}
    if not sb.configured():
        row = _memory.get(report_id)
        if not row or row["owner_id"] != owner_id:
            raise HTTPException(status_code=404, detail="리포트를 찾을 수 없습니다.")
        row.update(patch)
        return row
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.patch(
            f"{sb.SUPABASE_URL}/rest/v1/reports",
            headers=sb._rest_headers("return=representation"),
            params={"id": f"eq.{report_id}", "owner_id": f"eq.{owner_id}"},
            json=patch,
        )
    if resp.status_code >= 400 or not resp.json():
        raise HTTPException(status_code=502, detail="리포트 갱신에 실패했습니다.")
    return resp.json()[0]


async def get(report_id: str, owner_id: str) -> dict[str, Any] | None:
    if not sb.configured():
        row = _memory.get(report_id)
        return row if row and row["owner_id"] == owner_id else None
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{sb.SUPABASE_URL}/rest/v1/reports",
            headers=sb._rest_headers(),
            params={"id": f"eq.{report_id}", "owner_id": f"eq.{owner_id}", "select": "*", "limit": "1"},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="리포트 조회에 실패했습니다.")
    rows = resp.json()
    return rows[0] if rows else None


async def find_by_analysis(owner_id: str, analysis_id: str) -> dict[str, Any] | None:
    if not sb.configured():
        for row in _memory.values():
            if row["owner_id"] == owner_id and row["analysis_id"] == analysis_id:
                return row
        return None
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{sb.SUPABASE_URL}/rest/v1/reports",
            headers=sb._rest_headers(),
            params={"owner_id": f"eq.{owner_id}", "analysis_id": f"eq.{analysis_id}", "select": "*", "limit": "1"},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="리포트 조회에 실패했습니다.")
    rows = resp.json()
    return rows[0] if rows else None


async def list_for(owner_id: str) -> list[dict[str, Any]]:
    if not sb.configured():
        rows = [r for r in _memory.values() if r["owner_id"] == owner_id]
        return sorted(rows, key=lambda r: r["created_at"], reverse=True)
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{sb.SUPABASE_URL}/rest/v1/reports",
            headers=sb._rest_headers(),
            params={"owner_id": f"eq.{owner_id}", "select": "*", "order": "created_at.desc"},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="리포트 목록 조회에 실패했습니다.")
    return resp.json()


async def delete_for(owner_id: str) -> None:
    """계정 삭제용. analyses 가 restrict 라 reports 를 먼저 지워야 한다."""
    if not sb.configured():
        for rid in [k for k, v in _memory.items() if v["owner_id"] == owner_id]:
            _memory.pop(rid, None)
        return
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.delete(f"{sb.SUPABASE_URL}/rest/v1/reports", headers=sb._rest_headers(), params={"owner_id": f"eq.{owner_id}"})
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="리포트 삭제에 실패했습니다.")


def reset_memory() -> None:
    _memory.clear()
