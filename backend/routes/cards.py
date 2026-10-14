"""
POST /api/cards/{hair|makeup|total} — RAG + Gemini 카드 4장 생성 (구 무료 흐름).

새 제품에서는 유료 리포트(/api/reports)가 이 역할을 대신한다. 프론트가 리포트로 옮겨 가면
CARDS_API_MODE=report_only 로 이 API 를 닫는다 — 권한 없이 추천 본문을 생성·조회하는 길을 없애기 위해 (plan 0009 P3).
그 전까지는 open (기본) 으로 기존 화면이 계속 동작한다.
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models import errors
from models.errors import ApiError
from models.schemas import CardsRequest
from services import gemini_service, supabase_service

router = APIRouter()


def _to_analysis(body: CardsRequest) -> dict:
    return {
        "faceType": body.faceType,
        "personalColor": body.personalColor,
        "features": body.features or [],
    }


async def _wrap(generator, body: CardsRequest, principal: Principal, request: Request):
    if os.getenv("CARDS_API_MODE", "open").strip().lower() == "report_only":
        raise ApiError(errors.REPORT_ACCESS_REQUIRED, "추천 카드는 Beauty Report 로 제공돼요.")
    rate_limit.consume("cards", principal, request)
    try:
        cards = await generator(_to_analysis(body))
    except gemini_service.GeminiError as e:
        status = 503 if gemini_service.is_transient_error(str(e)) else 400
        raise HTTPException(status_code=status, detail=str(e))
    if not principal.is_guest and body.analysisId:
        card_type = cards[0].get("cardType") if cards else None
        await supabase_service.insert_cards(
            user_id=principal.user_id,
            analysis_id=body.analysisId,
            card_type=card_type or "unknown",
            card_data=cards,
        )
    return cards


@router.post("/cards/hair")
async def cards_hair(
    body: CardsRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    return await _wrap(gemini_service.generate_hair_cards, body, principal, request)


@router.post("/cards/makeup")
async def cards_makeup(
    body: CardsRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    return await _wrap(gemini_service.generate_makeup_cards, body, principal, request)


@router.post("/cards/total")
async def cards_total(
    body: CardsRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    return await _wrap(gemini_service.generate_total_cards, body, principal, request)
