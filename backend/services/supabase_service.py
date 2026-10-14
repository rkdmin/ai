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

from models.schemas import ANALYSIS_SCHEMA_VERSION


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_PHOTO_BUCKET = os.getenv("SUPABASE_PHOTO_BUCKET", "analysis-photos")

# 사진 보관 기간 (일). 코드에 박지 않고 설정으로 둔다 — 안내 문구(PhotoUpload·개인정보)는 이 값을 따라야 한다.
# 기간 자체(R16)는 미결이라 기본값은 기존 동작(정면 90일, 생성 사진 30일)을 유지한다.
PHOTO_RETENTION_DAYS = int(os.getenv("PHOTO_RETENTION_DAYS", "90"))
GENERATED_PHOTO_RETENTION_DAYS = int(os.getenv("GENERATED_PHOTO_RETENTION_DAYS", "30"))


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


# result JSON 에 넣지 않는 키. faceRatios 는 전용 컬럼이 있고, faceTypeReason 은 진단용이라
# DB 에 남기지 않는다 (api-contract). analysisId 는 행 자체가 ID 다.
_RESULT_EXCLUDED_KEYS = frozenset({"faceRatios", "faceTypeReason", "analysisId", "frontImage"})


def analysis_result_payload(result: dict[str, Any]) -> dict[str, Any]:
    """저장용 result JSON — 응답 그대로에서 전용 컬럼·진단 필드를 뺀 것."""
    return {k: v for k, v in result.items() if k not in _RESULT_EXCLUDED_KEYS}


def analysis_from_row(row: dict[str, Any]) -> dict[str, Any]:
    """
    analyses 행 → 응답 analysis dict. **legacy adapter** 가 여기 있다.

    v2 이상 행은 result JSON 을 그대로 쓴다. v1 행(result 없음)은 컬럼으로만 복원하고
    무드는 빈 배열로 둔다. 현재 버전보다 낮으면 legacy=True — 저장하지 않은 값(v1 의 무드,
    v2 의 primaryMood·traits)을 지어내 채우지 않는다. UI 는 legacy 를 보고 "정보 없음"을 표현한다.
    """
    version = int(row.get("schema_version") or 1)
    stored = row.get("result") if version >= 2 else None
    if isinstance(stored, dict):
        analysis = dict(stored)
        legacy = version < ANALYSIS_SCHEMA_VERSION
    else:
        analysis = {
            "faceType": row.get("face_type"),
            "features": row.get("features") or [],
            "moodArchetype": list(row.get("mood_archetype") or []),
        }
        legacy = True
    analysis.setdefault("faceType", row.get("face_type"))
    analysis.setdefault("features", row.get("features") or [])
    analysis.setdefault("moodArchetype", list(row.get("mood_archetype") or []))
    analysis["faceRatios"] = row.get("face_ratios")
    analysis["analysisId"] = row.get("id")
    analysis["schemaVersion"] = version
    analysis["legacy"] = legacy
    return analysis


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
        "mood_archetype": list(result.get("moodArchetype") or []),
        "result": analysis_result_payload(result),
        "schema_version": int(result.get("schemaVersion") or ANALYSIS_SCHEMA_VERSION),
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


def style_key_for(card: dict[str, Any] | None) -> str:
    """TRY ON 캐시 키의 스타일 부분 (F06). 같은 추천이면 같은 키, 다른 추천이면 다른 키.
    스타일명·앞머리·rank 로 만든다 — 모델이 쓴 긴 설명문은 넣지 않는다 (사소한 표기 차이로 캐시가 깨진다)."""
    card = card or {}
    parts = [str(card.get("hair") or "").strip(), str(card.get("bangs") or "").strip(), str(card.get("rank") or "")]
    return "|".join(parts).lower()[:200]


async def get_generated_photo(user_id: str, analysis_id: str, card_type: str, style_key: str = "") -> dict[str, Any] | None:
    if not configured() or not analysis_id:
        return None
    await _assert_analysis_owner(user_id, analysis_id)
    params = {
        "analysis_id": f"eq.{analysis_id}",
        "card_type": f"eq.{card_type}",
        "style_key": f"eq.{style_key}",
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


async def insert_generated_photo(user_id: str, analysis_id: str, card_type: str, storage_url: str, style_key: str = "") -> None:
    if not configured() or not analysis_id:
        return
    await _assert_analysis_owner(user_id, analysis_id)
    expires_at = datetime.now(timezone.utc) + timedelta(days=GENERATED_PHOTO_RETENTION_DAYS)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/generated_photos",
            headers=_rest_headers("resolution=merge-duplicates"),
            json={
                "analysis_id": analysis_id,
                "card_type": card_type,
                "style_key": style_key,
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
        "select": "id,face_type,personal_color,mood_archetype,schema_version,created_at,photo_expires_at,front_image_url,cards(card_type)",
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
        version = int(row.get("schema_version") or 1)
        items.append(
            {
                "analysisId": row["id"],
                "faceType": row["face_type"],
                "personalColor": row.get("personal_color"),
                "moodArchetype": list(row.get("mood_archetype") or []),
                "cardTypes": sorted({c["card_type"] for c in row.get("cards", []) if c.get("card_type")}),
                "createdAt": row["created_at"],
                "photoExpired": expired or not row.get("front_image_url"),
                "schemaVersion": version,
                "legacy": version < ANALYSIS_SCHEMA_VERSION,
            }
        )
    return items


async def get_history_detail(user_id: str, analysis_id: str) -> dict[str, Any]:
    row = await _get_analysis(
        user_id,
        analysis_id,
        select="id,face_type,face_ratios,personal_color,features,mood_archetype,result,schema_version,created_at,photo_expires_at,front_image_url,cards(card_type,card_data),generated_photos(card_type,storage_url,expires_at)",
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
    analysis = analysis_from_row(row)
    analysis.update(
        {
            "personalColor": row.get("personal_color"),
            "createdAt": row.get("created_at"),
            "photoExpired": bool(row.get("photo_expires_at") and datetime.fromisoformat(row["photo_expires_at"].replace("Z", "+00:00")) < now),
            "frontImageUrl": row.get("front_image_url"),
        }
    )
    return {
        "analysis": analysis,
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


# ── 계정 데이터 삭제 (F12 선행) ───────────────────────────────────


async def _storage_list(client: httpx.AsyncClient, prefix: str) -> list[str]:
    """prefix 아래 객체 경로 목록. 폴더 한 단계만 본다 (analyses/<uid>/<file>, generated/<uid>/<analysis>/<file>)."""
    paths: list[str] = []
    resp = await client.post(
        f"{SUPABASE_URL}/storage/v1/object/list/{SUPABASE_PHOTO_BUCKET}",
        headers=_rest_headers(),
        json={"prefix": prefix, "limit": 1000, "offset": 0},
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Storage 목록 조회 실패 ({prefix})")
    for obj in resp.json():
        name = obj.get("name")
        if not name:
            continue
        if obj.get("id") is None:  # 폴더 — 한 단계 더 내려간다
            paths.extend(await _storage_list(client, f"{prefix}/{name}"))
        else:
            paths.append(f"{prefix}/{name}")
    return paths


async def delete_user_data(user_id: str) -> dict[str, Any]:
    """
    사용자의 서버 데이터를 전부 지운다. 순서: Storage 원본·생성 사진 → analyses(cascade: cards·feedback·
    generated_photos) → usage_counters → auth 사용자. 각 단계는 독립이라 하나가 실패해도 나머지는 진행하고
    errors 에 남긴다. 다시 호출하면 남은 것만 지운다 (없는 건 404 가 아니라 0건 삭제로 처리).
    """
    report: dict[str, Any] = {"storageDeleted": 0, "analysesDeleted": False, "authUserDeleted": False, "errors": []}
    if not configured():
        report["errors"].append("Supabase 미설정 — 서버에 지울 데이터가 없다")
        return report

    async with httpx.AsyncClient(timeout=30) as client:
        # 1) Storage
        try:
            paths: list[str] = []
            for prefix in (f"analyses/{user_id}", f"generated/{user_id}"):
                paths.extend(await _storage_list(client, prefix))
            if paths:
                resp = await client.request(
                    "DELETE",
                    f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_PHOTO_BUCKET}",
                    headers=_rest_headers(),
                    json={"prefixes": paths},
                )
                if resp.status_code >= 400:
                    raise HTTPException(status_code=502, detail="Storage 삭제 실패")
                report["storageDeleted"] = len(paths)
        except Exception as e:  # noqa: BLE001 — 부분 실패를 모아서 돌려준다
            report["errors"].append(f"storage: {getattr(e, 'detail', e)}")

        # 2) 리포트(analyses 를 restrict 로 참조) → 분석 행 (cascade) → 사용량 카운터
        for table in ("reports", "analyses", "usage_counters"):
            resp = await client.delete(
                f"{SUPABASE_URL}/rest/v1/{table}",
                headers=_rest_headers(),
                params={"user_id": f"eq.{user_id}"},
            )
            if resp.status_code >= 400:
                report["errors"].append(f"{table}: 삭제 실패 ({resp.status_code})")
            elif table == "analyses":
                report["analysesDeleted"] = True

        # 3) auth 사용자 — service role 필요. 없으면 여기까지만 지우고 알린다.
        if not SUPABASE_SERVICE_ROLE_KEY:
            report["errors"].append("auth: SUPABASE_SERVICE_ROLE_KEY 없음 — 계정 행은 남는다")
        else:
            resp = await client.delete(
                f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                headers={"apikey": SUPABASE_SERVICE_ROLE_KEY, "authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"},
            )
            if resp.status_code in (200, 204, 404):
                report["authUserDeleted"] = True
            else:
                report["errors"].append(f"auth: 사용자 삭제 실패 ({resp.status_code})")
    return report
