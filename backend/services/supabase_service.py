"""Supabase Auth, REST, Storage helpers for Phase 3."""
from __future__ import annotations

import base64
import mimetypes
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_PHOTO_BUCKET = os.getenv("SUPABASE_PHOTO_BUCKET", "analysis-photos")


def configured() -> bool:
    return bool(SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY))


def _service_key() -> str:
    return SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY


def _rest_headers(prefer: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": _service_key(),
        "authorization": f"Bearer {_service_key()}",
        "content-type": "application/json",
    }
    if prefer:
        headers["prefer"] = prefer
    return headers


async def verify_access_token(token: str) -> dict[str, Any] | None:
    """Ask Supabase Auth to validate a user access token."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "authorization": f"Bearer {token}",
            },
        )
    if resp.status_code == 401:
        return None
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="인증 서버 응답을 확인할 수 없습니다.")
    data = resp.json()
    if not data.get("id"):
        return None
    return data


def _parse_data_url(data_url: str) -> tuple[bytes, str]:
    if "," in data_url and data_url.startswith("data:"):
        meta, raw = data_url.split(",", 1)
        content_type = meta[5:].split(";", 1)[0] or "image/jpeg"
        return base64.b64decode(raw), content_type
    return base64.b64decode(data_url), "image/jpeg"


async def upload_image_data_url(data_url: str, prefix: str, ttl_days: int) -> tuple[str | None, datetime]:
    """Upload an image to Supabase Storage. Returns public URL and expiry time."""
    expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)
    if not configured() or not data_url:
        return None, expires_at

    image_bytes, content_type = _parse_data_url(data_url)
    ext = mimetypes.guess_extension(content_type) or ".jpg"
    object_path = f"{prefix}/{uuid.uuid4()}{ext}"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_PHOTO_BUCKET}/{object_path}",
            headers={
                "apikey": _service_key(),
                "authorization": f"Bearer {_service_key()}",
                "content-type": content_type,
                "x-upsert": "false",
            },
            content=image_bytes,
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="사진 저장에 실패했습니다.")

    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_PHOTO_BUCKET}/{object_path}", expires_at


async def insert_analysis(
    *,
    user_id: str,
    result: dict[str, Any],
    personal_color: str | None,
    front_image_url: str | None,
    photo_expires_at: datetime,
) -> str:
    if not configured():
        return str(uuid.uuid4())

    payload = {
        "user_id": user_id,
        "face_type": result.get("faceType"),
        "face_ratios": result.get("faceRatios"),
        "personal_color": personal_color,
        "features": result.get("features") or [],
        "front_image_url": front_image_url,
        "photo_expires_at": photo_expires_at.isoformat(),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/analyses",
            headers=_rest_headers("return=representation"),
            json=payload,
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="분석 결과 저장에 실패했습니다.")
    return resp.json()[0]["id"]


async def insert_cards(*, user_id: str, analysis_id: str, card_type: str, card_data: Any) -> None:
    if not configured() or not analysis_id:
        return
    await _assert_analysis_owner(user_id, analysis_id)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/cards",
            headers=_rest_headers(),
            json={"analysis_id": analysis_id, "card_type": card_type, "card_data": card_data},
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="카드 저장에 실패했습니다.")


async def get_generated_photo(user_id: str, analysis_id: str, card_type: str) -> dict[str, Any] | None:
    if not configured() or not analysis_id:
        return None
    await _assert_analysis_owner(user_id, analysis_id)
    params = {
        "analysis_id": f"eq.{analysis_id}",
        "card_type": f"eq.{card_type}",
        "select": "storage_url,expires_at",
        "limit": "1",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/generated_photos", headers=_rest_headers(), params=params)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="생성 사진 조회에 실패했습니다.")
    rows = resp.json()
    if not rows:
        return None
    expires_at = rows[0].get("expires_at")
    if expires_at and datetime.fromisoformat(expires_at.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        return None
    return rows[0]


async def insert_generated_photo(user_id: str, analysis_id: str, card_type: str, storage_url: str) -> None:
    if not configured() or not analysis_id:
        return
    await _assert_analysis_owner(user_id, analysis_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/generated_photos",
            headers=_rest_headers("resolution=merge-duplicates"),
            json={
                "analysis_id": analysis_id,
                "card_type": card_type,
                "storage_url": storage_url,
                "expires_at": expires_at.isoformat(),
            },
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="생성 사진 저장에 실패했습니다.")


async def fetch_front_image_url(user_id: str, analysis_id: str) -> str | None:
    row = await _get_analysis(user_id, analysis_id, select="front_image_url")
    return row.get("front_image_url") if row else None


async def fetch_front_image_data_url(user_id: str, analysis_id: str) -> str | None:
    url = await fetch_front_image_url(user_id, analysis_id)
    if not url:
        return None
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers={"apikey": _service_key()} if configured() else None)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="원본 사진 다운로드에 실패했습니다.")
    content_type = resp.headers.get("content-type", "image/jpeg").split(";", 1)[0]
    data = base64.b64encode(resp.content).decode("ascii")
    return f"data:{content_type};base64,{data}"


async def list_history(user_id: str, limit: int = 5) -> list[dict[str, Any]]:
    if not configured():
        return []
    params = {
        "user_id": f"eq.{user_id}",
        "select": "id,face_type,personal_color,created_at,photo_expires_at,front_image_url,cards(card_type)",
        "order": "created_at.desc",
        "limit": str(limit),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/analyses", headers=_rest_headers(), params=params)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="히스토리 조회에 실패했습니다.")
    now = datetime.now(timezone.utc)
    items = []
    for row in resp.json():
        expires = row.get("photo_expires_at")
        expired = bool(expires and datetime.fromisoformat(expires.replace("Z", "+00:00")) < now)
        items.append(
            {
                "analysisId": row["id"],
                "faceType": row["face_type"],
                "personalColor": row.get("personal_color"),
                "cardTypes": sorted({c["card_type"] for c in row.get("cards", []) if c.get("card_type")}),
                "createdAt": row["created_at"],
                "photoExpired": expired or not row.get("front_image_url"),
            }
        )
    return items


async def get_history_detail(user_id: str, analysis_id: str) -> dict[str, Any]:
    row = await _get_analysis(
        user_id,
        analysis_id,
        select="id,face_type,face_ratios,personal_color,features,created_at,photo_expires_at,front_image_url,cards(card_type,card_data),generated_photos(card_type,storage_url,expires_at)",
    )
    if not row:
        raise HTTPException(status_code=404, detail="히스토리를 찾을 수 없습니다.")
    now = datetime.now(timezone.utc)
    generated = []
    for photo in row.get("generated_photos", []):
        expires = photo.get("expires_at")
        if expires and datetime.fromisoformat(expires.replace("Z", "+00:00")) < now:
            continue
        generated.append(photo)
    return {
        "analysis": {
            "faceType": row["face_type"],
            "features": row.get("features") or [],
            "moodArchetype": [],
            "faceRatios": row.get("face_ratios"),
            "analysisId": row["id"],
            "personalColor": row.get("personal_color"),
            "createdAt": row.get("created_at"),
            "photoExpired": bool(row.get("photo_expires_at") and datetime.fromisoformat(row["photo_expires_at"].replace("Z", "+00:00")) < now),
            "frontImageUrl": row.get("front_image_url"),
        },
        "cards": [c.get("card_data") for c in row.get("cards", []) if c.get("card_data")],
        "generatedPhotos": generated,
    }


async def _assert_analysis_owner(user_id: str, analysis_id: str) -> None:
    if not await _get_analysis(user_id, analysis_id, select="id"):
        raise HTTPException(status_code=404, detail="분석 기록을 찾을 수 없습니다.")


async def _get_analysis(user_id: str, analysis_id: str, select: str) -> dict[str, Any] | None:
    if not configured():
        return None
    params = {"id": f"eq.{analysis_id}", "user_id": f"eq.{user_id}", "select": select, "limit": "1"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/analyses", headers=_rest_headers(), params=params)
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="분석 기록 조회에 실패했습니다.")
    rows = resp.json()
    return rows[0] if rows else None
