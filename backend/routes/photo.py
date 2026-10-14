"""
POST /api/photo/generate — 스타일 적용 사진 생성 (로그인 전용). TRY ON.

F06 (plan 0009 P3):
- 캐시 키는 분석 + 카드 종류 + **스타일**(style_key). 추천 3개가 각자 합성된다.
- 캐시 조회가 한도 차감보다 **먼저**다. 재열람은 사용량으로 세지 않는다.
- reportId 가 오면 리포트 권한(report_service.has_access)을 요구한다. 리포트 안의 TRY ON 은 구매 뒤에만.
  analysisId 만 오면 기존 무료 흐름 그대로다 (CARDS_API_MODE 가 report_only 면 그것도 막힌다).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, require_user
from models import errors
from models.errors import ApiError
from models.schemas import PhotoRequest, PhotoResponse
from services import gemini_service, report_service, supabase_service

router = APIRouter()


def legacy_cards_blocked() -> bool:
    """CARDS_API_MODE=report_only 면 무료 카드 API 와 카드 기반 TRY ON 을 막는다 (구 API 공개 범위 제한)."""
    import os

    return os.getenv("CARDS_API_MODE", "open").strip().lower() == "report_only"


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

    if body.reportId and not await report_service.has_access(principal.user_id):
        raise ApiError(errors.REPORT_ACCESS_REQUIRED)
    if not body.reportId and legacy_cards_blocked():
        raise ApiError(errors.REPORT_ACCESS_REQUIRED, "TRY ON 은 Beauty Report 안에서만 쓸 수 있어요.")

    style_key = supabase_service.style_key_for(body.card)

    # 캐시 재열람은 새 생성이 아니다 — 한도를 차감하기 전에 본다.
    if body.analysisId:
        cached = await supabase_service.get_generated_photo(principal.user_id, body.analysisId, body.cardType, style_key)
        if cached:
            return PhotoResponse(generatedImage=cached["storage_url"], cached=True)

    rate_limit.consume("photo", principal, request)

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
            ttl_days=supabase_service.GENERATED_PHOTO_RETENTION_DAYS,
        )
        await supabase_service.insert_generated_photo(
            principal.user_id,
            body.analysisId,
            body.cardType,
            storage_url or image_data_url,
            style_key,
        )

    return PhotoResponse(generatedImage=image_data_url, cached=False)
