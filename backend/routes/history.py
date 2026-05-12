"""History save/list/detail endpoints for authenticated users."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from middleware.auth import Principal, require_user
from models.schemas import HistoryDetailResponse, HistoryListItem, HistorySaveRequest
from services import supabase_service

router = APIRouter()


@router.post("/history")
async def save_history(
    body: HistorySaveRequest,
    principal: Principal = Depends(require_user),
):
    if body.cardType not in ("hair", "makeup", "total"):
        raise HTTPException(status_code=400, detail="cardType은 hair, makeup, total 중 하나여야 합니다.")
    await supabase_service.insert_cards(
        user_id=principal.user_id,
        analysis_id=body.analysisId,
        card_type=body.cardType,
        card_data=body.cardData,
    )
    return {"ok": True}


@router.get("/history", response_model=list[HistoryListItem])
async def list_history(
    principal: Principal = Depends(require_user),
    limit: int = Query(default=5, ge=1, le=20),
):
    return await supabase_service.list_history(principal.user_id, limit=limit)


@router.get("/history/{analysis_id}", response_model=HistoryDetailResponse)
async def history_detail(
    analysis_id: str,
    principal: Principal = Depends(require_user),
):
    return await supabase_service.get_history_detail(principal.user_id, analysis_id)
