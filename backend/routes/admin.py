"""
운영용 엔드포인트 (plan 0009 P7 · F12). 사용자 토큰이 아니라 ADMIN_TOKEN(X-Admin-Token) 으로만 연다.
ADMIN_TOKEN 이 비어 있으면 전부 404 — 설정 안 한 환경에선 존재하지 않는 것처럼 동작한다.

POST /api/admin/cleanup-expired — 만료된 정면·생성 사진을 Storage 에서 지우고 행을 정리한다 (멱등)
"""
from __future__ import annotations

import os
import secrets

from fastapi import APIRouter, Header, HTTPException

from services import cleanup_service

router = APIRouter()


def _require_admin(token: str | None) -> None:
    expected = os.getenv("ADMIN_TOKEN", "").strip()
    if not expected:
        raise HTTPException(status_code=404, detail="Not Found")
    if not token or not secrets.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="관리자 토큰이 올바르지 않습니다.")


@router.post("/admin/cleanup-expired")
async def cleanup_expired(x_admin_token: str | None = Header(default=None)):
    _require_admin(x_admin_token)
    return await cleanup_service.cleanup_expired()
