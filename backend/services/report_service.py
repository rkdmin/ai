"""
통합 Beauty Report (plan 0009 P3 · F04, ADR 0010 R01).

- 리포트 = 구매 시점 분석 snapshot + Hair 카드 + Makeup 카드. 재분석해도 바뀌지 않는다.
- 생성 상태: not_started → generating → ready | partial_failed | failed. 실패한 탭만 다시 만든다.
- 접근 제어는 아직 결제(P4)가 없으므로 REPORT_ACCESS_MODE 로 한다:
    entitlement (기본) — entitlements 테이블의 활성 행이 있어야 한다. P4 전에는 항상 거부된다.
    open               — 로그인만 하면 만들 수 있다. 로컬 개발·테스트용. 운영에서 켜지 마라.
  P4 가 끝나면 has_access() 가 entitlements 를 실제로 조회하게 바뀐다. 호출 지점은 그대로다.
"""
from __future__ import annotations

import os
import sys
from typing import Any

from models import errors
from models.errors import ApiError
from services import gemini_service, report_store, supabase_service

REPORT_ACCESS_MODE = os.getenv("REPORT_ACCESS_MODE", "entitlement").strip().lower()

PARTS = ("hair", "makeup")


async def has_access(user_id: str) -> bool:
    """리포트를 만들고 볼 권한. 지금은 모드 스위치, P4 이후엔 entitlements 조회."""
    mode = os.getenv("REPORT_ACCESS_MODE", REPORT_ACCESS_MODE).strip().lower()
    if mode == "open":
        return True
    # TODO(P4): select from entitlements where owner_id = user_id and active. 테이블이 아직 없다.
    return False


def _snapshot_summary(snapshot: dict[str, Any]) -> dict[str, Any]:
    """홈·MY 가 쓰는 요약. 전체 snapshot 을 매번 내려보내지 않는다."""
    return {
        "faceType": snapshot.get("faceType"),
        "primaryMood": snapshot.get("primaryMood"),
        "moodTitle": snapshot.get("moodTitle"),
        "traits": snapshot.get("traits") or [],
        "personalColor": snapshot.get("personalColor"),
        "schemaVersion": snapshot.get("schemaVersion"),
    }


def to_response(row: dict[str, Any], *, unlocked: bool) -> dict[str, Any]:
    """권한이 없으면 본문(hair/makeup)을 뺀다 — '구매 전 전체 본문이 payload 에 없음' 완료 기준."""
    return {
        "id": row["id"],
        "analysisId": row["analysis_id"],
        "status": row["status"],
        "locked": not unlocked,
        "analysis": _snapshot_summary(row.get("analysis_snapshot") or {}),
        "hair": row.get("hair") if unlocked else None,
        "makeup": row.get("makeup") if unlocked else None,
        "hairError": row.get("hair_error"),
        "makeupError": row.get("makeup_error"),
        "createdAt": row.get("created_at"),
        "updatedAt": row.get("updated_at"),
    }


def _analysis_for_cards(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "faceType": snapshot.get("faceType"),
        "personalColor": snapshot.get("personalColor"),
        "features": snapshot.get("features") or [],
        "moodArchetype": snapshot.get("moodArchetype") or [],
        "primaryMood": snapshot.get("primaryMood"),
        "moodTitle": snapshot.get("moodTitle"),
        "traits": snapshot.get("traits") or [],
    }


async def _generate_parts(row: dict[str, Any], parts: tuple[str, ...]) -> dict[str, Any]:
    """지정한 탭만 생성한다. 한 탭이 실패해도 다른 탭은 저장한다."""
    analysis = _analysis_for_cards(row.get("analysis_snapshot") or {})
    patch: dict[str, Any] = {}
    # D02·D03 — 리포트 전용 포맷 (overview·styles/looks·salonGuide·focusParts). 무료 카드 생성과 분리
    generators = {"hair": gemini_service.generate_hair_report, "makeup": gemini_service.generate_makeup_report}
    for part in parts:
        try:
            patch[part] = await generators[part](analysis)
            patch[f"{part}_error"] = None
        except gemini_service.GeminiError as e:
            patch[part] = None
            patch[f"{part}_error"] = str(e)
            print(f"[report] {part} 생성 실패 report={row['id']}: {e}", file=sys.stderr)
    merged = {**row, **patch}
    done = [p for p in PARTS if merged.get(p)]
    patch["status"] = "ready" if len(done) == len(PARTS) else ("partial_failed" if done else "failed")
    return patch


async def create_report(user_id: str, analysis_id: str) -> dict[str, Any]:
    """같은 분석의 리포트가 있으면 그것을 돌려준다 (멱등). 없으면 만들고 두 탭을 생성한다."""
    if not await has_access(user_id):
        raise ApiError(errors.REPORT_ACCESS_REQUIRED)

    existing = await report_store.find_by_analysis(user_id, analysis_id)
    if existing:
        if existing["status"] in ("failed", "partial_failed"):
            return await retry_report(user_id, existing["id"])
        return existing

    select = "id,face_type,face_ratios,personal_color,features,mood_archetype,result,schema_version"
    analysis_row = await supabase_service._get_analysis(user_id, analysis_id, select=select) if supabase_service.configured() else None
    if analysis_row is None:
        if supabase_service.configured():
            raise ApiError(errors.NOT_FOUND, "분석 기록을 찾을 수 없습니다.")
        # 로컬(미설정): 분석 저장이 없으므로 최소 snapshot 으로 진행한다. 운영 경로가 아니다.
        snapshot = {"analysisId": analysis_id, "faceType": "계란형", "features": [], "moodArchetype": [], "schemaVersion": 0}
    else:
        snapshot = supabase_service.analysis_from_row(analysis_row)
        snapshot["personalColor"] = analysis_row.get("personal_color")
        snapshot.pop("faceRatios", None)

    row = await report_store.insert(user_id, analysis_id, snapshot, int(snapshot.get("schemaVersion") or 0))
    row = await report_store.update(row["id"], user_id, {"status": "generating"})
    patch = await _generate_parts(row, PARTS)
    return await report_store.update(row["id"], user_id, patch)


async def retry_report(user_id: str, report_id: str) -> dict[str, Any]:
    """실패한 탭만 다시 만든다. 성공한 탭은 재생성하지 않는다 (비용·일관성)."""
    if not await has_access(user_id):
        raise ApiError(errors.REPORT_ACCESS_REQUIRED)
    row = await report_store.get(report_id, user_id)
    if not row:
        raise ApiError(errors.NOT_FOUND, "리포트를 찾을 수 없습니다.")
    missing = tuple(p for p in PARTS if not row.get(p))
    if not missing:
        return row
    row = await report_store.update(report_id, user_id, {"status": "generating"})
    patch = await _generate_parts(row, missing)
    return await report_store.update(report_id, user_id, patch)


async def get_report(user_id: str, report_id: str) -> dict[str, Any]:
    row = await report_store.get(report_id, user_id)
    if not row:
        raise ApiError(errors.NOT_FOUND, "리포트를 찾을 수 없습니다.")
    return to_response(row, unlocked=await has_access(user_id))


async def list_reports(user_id: str) -> list[dict[str, Any]]:
    unlocked = await has_access(user_id)
    return [to_response(r, unlocked=unlocked) for r in await report_store.list_for(user_id)]
