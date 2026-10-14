"""
만료된 사진 실제 삭제 (plan 0009 P7 · F12, R16 선행).

지금까지는 photo_expires_at / expires_at 에 시각만 적고 파일은 그대로 남았다 — "90일 보관" 안내가 거짓이 되는 지점.
이 서비스가 만료된 정면 사진(analyses.front_image_url)과 생성 사진(generated_photos)을 Storage 에서 지우고
행을 정리한다. 실행 경로는 둘: 스크립트 `python -m jobs.cleanup_expired_photos` (cron) 또는
POST /api/admin/cleanup-expired (X-Admin-Token). 멱등 — 다시 돌리면 남은 것만 지운다.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from services import supabase_service as sb


def object_path_from_public_url(url: str | None) -> str | None:
    """`{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}` → `{path}`. 우리 버킷이 아니면 None."""
    if not url:
        return None
    marker = f"/storage/v1/object/public/{sb.SUPABASE_PHOTO_BUCKET}/"
    idx = url.find(marker)
    return url[idx + len(marker):] if idx >= 0 else None


async def _delete_objects(client: httpx.AsyncClient, paths: list[str]) -> int:
    if not paths:
        return 0
    resp = await client.request(
        "DELETE",
        f"{sb.SUPABASE_URL}/storage/v1/object/{sb.SUPABASE_PHOTO_BUCKET}",
        headers=sb._rest_headers(),
        json={"prefixes": paths},
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail="만료 사진 삭제에 실패했습니다.")
    return len(paths)


async def cleanup_expired(now: datetime | None = None, limit: int = 500) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    report: dict[str, Any] = {"frontPhotosDeleted": 0, "generatedPhotosDeleted": 0, "errors": [], "ranAt": now.isoformat()}
    if not sb.configured():
        report["errors"].append("Supabase 미설정 — 지울 것이 없다")
        return report

    iso = now.isoformat()
    async with httpx.AsyncClient(timeout=60) as client:
        # 1) 만료된 정면 사진: 파일 삭제 → front_image_url 비움 (분석 행·무드는 남는다. 사진만 사라진다)
        try:
            resp = await client.get(
                f"{sb.SUPABASE_URL}/rest/v1/analyses",
                headers=sb._rest_headers(),
                params={"photo_expires_at": f"lt.{iso}", "front_image_url": "not.is.null", "select": "id,front_image_url", "limit": str(limit)},
            )
            resp.raise_for_status()
            rows = resp.json()
            paths = [p for r in rows for p in [object_path_from_public_url(r.get("front_image_url"))] if p]
            await _delete_objects(client, paths)
            if rows:
                ids = ",".join(r["id"] for r in rows)
                upd = await client.patch(
                    f"{sb.SUPABASE_URL}/rest/v1/analyses",
                    headers=sb._rest_headers(),
                    params={"id": f"in.({ids})"},
                    json={"front_image_url": None},
                )
                upd.raise_for_status()
            report["frontPhotosDeleted"] = len(rows)
        except Exception as e:  # noqa: BLE001
            report["errors"].append(f"front: {getattr(e, 'detail', e)}")

        # 2) 만료된 생성 사진: 파일 삭제 → 행 삭제 (캐시라 행도 지운다)
        try:
            resp = await client.get(
                f"{sb.SUPABASE_URL}/rest/v1/generated_photos",
                headers=sb._rest_headers(),
                params={"expires_at": f"lt.{iso}", "select": "id,storage_url", "limit": str(limit)},
            )
            resp.raise_for_status()
            rows = resp.json()
            paths = [p for r in rows for p in [object_path_from_public_url(r.get("storage_url"))] if p]
            await _delete_objects(client, paths)
            if rows:
                ids = ",".join(r["id"] for r in rows)
                dele = await client.delete(f"{sb.SUPABASE_URL}/rest/v1/generated_photos", headers=sb._rest_headers(), params={"id": f"in.({ids})"})
                dele.raise_for_status()
            report["generatedPhotosDeleted"] = len(rows)
        except Exception as e:  # noqa: BLE001
            report["errors"].append(f"generated: {getattr(e, 'detail', e)}")
    return report
