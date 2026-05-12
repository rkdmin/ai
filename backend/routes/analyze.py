"""POST /api/analyze — MediaPipe + Gemini 얼굴 분석."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models.schemas import AnalyzeRequest, AnalyzeResponse
from services import gemini_service, mediapipe_service, supabase_service

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    rate_limit.consume("analyze", principal, request)

    # MediaPipe 비율 추출 — 실패해도(얼굴 미검출) Gemini가 이미지로 단독 분석 가능.
    face_ratios = mediapipe_service.extract_face_ratios(body.frontImage)

    try:
        result = await gemini_service.analyze_face(body.frontImage, face_ratios)
    except gemini_service.GeminiError as e:
        status = 503 if gemini_service.is_transient_error(str(e)) else 400
        raise HTTPException(status_code=status, detail=str(e))

    if not principal.is_guest:
        front_image_url, expires_at = await supabase_service.upload_image_data_url(
            body.frontImage,
            prefix=f"analyses/{principal.user_id}",
            ttl_days=90,
        )
        result["analysisId"] = await supabase_service.insert_analysis(
            user_id=principal.user_id,
            result=result,
            personal_color=body.personalColor,
            front_image_url=front_image_url,
            photo_expires_at=expires_at,
        )

    return result
