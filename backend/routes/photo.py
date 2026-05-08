"""
POST /api/photo/generate — 스타일 적용 사진 생성 (로그인 전용).

Phase 2 임시: frontImage 를 요청에 포함한다.
Phase 3 (Supabase Storage 도입 시) analyses.front_image_url 에서 가져오도록 변경한다.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, require_user
from models.schemas import PhotoRequest, PhotoResponse
from services import gemini_service

router = APIRouter()


@router.post("/photo/generate", response_model=PhotoResponse)
async def generate_photo(
    body: PhotoRequest,
    request: Request,
    principal: Principal = Depends(require_user),
):
    if body.cardType not in ("hair", "total"):
        raise HTTPException(status_code=400, detail="cardType은 'hair' 또는 'total' 이어야 합니다.")

    rate_limit.consume("photo", principal, request)

    try:
        image_data_url = await gemini_service.generate_styled_photo(body.frontImage, body.card)
    except gemini_service.GeminiError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Phase 3 자리표시자 — generated_photos UNIQUE(analysisId, cardType) 캐시 히트면 cached=true
    return PhotoResponse(generatedImage=image_data_url, cached=False)
