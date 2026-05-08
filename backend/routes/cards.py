"""POST /api/cards/{hair|makeup|total} — RAG + Gemini 카드 4장 생성."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models.schemas import CardsRequest
from services import gemini_service

router = APIRouter()


def _to_analysis(body: CardsRequest) -> dict:
    return {
        "faceType": body.faceType,
        "personalColor": body.personalColor,
        "features": body.features or [],
    }


async def _wrap(generator, body: CardsRequest, principal: Principal, request: Request):
    rate_limit.consume("cards", principal, request)
    try:
        return await generator(_to_analysis(body))
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=400, detail=str(e))


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
