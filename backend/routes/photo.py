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
from services import gemini_service, supabase_service

router = APIRouter()


@router.post("/photo/generate", response_model=PhotoResponse)
async def generate_photo(
    body: PhotoRequest,
    request: Request,
    principal: Principal = Depends(require_user),
):
    if body.cardType not in ("hair", "total"):
        raise HTTPException(status_code=400, detail="cardType은 'hair' 또는 'total' 이어야 합니다.")
    if not body.analysisId and not body.frontImage:
        raise HTTPException(status_code=400, detail="analysisId 또는 frontImage가 필요합니다.")

    rate_limit.consume("photo", principal, request)

    if body.analysisId:
        cached = await supabase_service.get_generated_photo(principal.user_id, body.analysisId, body.cardType)
        if cached:
            return PhotoResponse(generatedImage=cached["storage_url"], cached=True)

    front_image = body.frontImage
    if not front_image and body.analysisId:
        front_image = await supabase_service.fetch_front_image_data_url(principal.user_id, body.analysisId)
    if not front_image:
        raise HTTPException(status_code=404, detail="원본 사진을 찾을 수 없습니다.")

    try:
        image_data_url = await gemini_service.generate_styled_photo(front_image, body.card)
    except gemini_service.GeminiError as e:
        status = 503 if gemini_service.is_transient_error(str(e)) else 400
        raise HTTPException(status_code=status, detail=str(e))

    if body.analysisId:
        storage_url, _ = await supabase_service.upload_image_data_url(
            image_data_url,
            prefix=f"generated/{principal.user_id}/{body.analysisId}",
            ttl_days=30,
        )
        await supabase_service.insert_generated_photo(
            principal.user_id,
            body.analysisId,
            body.cardType,
            storage_url or image_data_url,
        )

    return PhotoResponse(generatedImage=image_data_url, cached=False)
