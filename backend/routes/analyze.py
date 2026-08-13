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

    # MediaPipe 로 얼굴을 못 찾으면 여기서 끊는다 — Gemini 유료 호출을 막는 무료 게이트.
    # 프론트는 status < 500 이라 error_face 화면으로 분기한다.
    #
    # 단 일러스트·3D 렌더링·마네킹은 랜드마크가 잡혀 이 게이트를 통과한다.
    # 실사 여부 판별은 ANALYZE_PROMPT 의 거부 조건(Gemini)이 계속 담당한다.
    face_ratios = mediapipe_service.extract_face_ratios(body.frontImage)
    if face_ratios is None:
        raise HTTPException(
            status_code=400,
            detail="사진에서 얼굴을 찾을 수 없어요. 정면 얼굴이 잘 보이는 사진으로 다시 시도해 주세요.",
        )

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
