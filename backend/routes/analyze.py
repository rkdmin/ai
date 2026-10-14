"""POST /api/analyze — MediaPipe + Gemini 얼굴 분석."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models import errors
from models.errors import ApiError
from models.schemas import ANALYSIS_SCHEMA_VERSION, AnalyzeRequest, AnalyzeResponse
from services import gemini_service, mediapipe_service, supabase_service

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    rate_limit.consume("analyze", principal, request)

    # MediaPipe 검사에서 걸리면 여기서 끊는다 — Gemini 유료 호출을 막는 무료 게이트.
    # 깨진 파일 / 얼굴 없음 / 여러 명 / 너무 작음 을 코드로 돌려준다 (F03).
    #
    # 단 일러스트·3D 렌더링·마네킹은 랜드마크가 잡혀 이 게이트를 통과한다.
    # 실사 여부 판별은 ANALYZE_PROMPT 의 거부 조건(Gemini)이 담당하고 UNSUPPORTED_PHOTO 로 나간다.
    check = mediapipe_service.inspect_image(body.frontImage)
    if check.code:
        raise ApiError(check.code, check.message)

    try:
        result = await gemini_service.analyze_face(body.frontImage, check.face_ratios)
    except gemini_service.GeminiRejected as e:
        raise ApiError(errors.UNSUPPORTED_PHOTO, str(e))
    except gemini_service.GeminiError as e:
        if gemini_service.is_transient_error(str(e)):
            raise ApiError(errors.AI_UNAVAILABLE, str(e))
        raise ApiError(errors.AI_ERROR, str(e), status_code=400)

    # 저장본과 응답이 같은 모양 버전을 갖도록 insert 전에 찍는다.
    result["schemaVersion"] = ANALYSIS_SCHEMA_VERSION

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
