"""
POST /api/photos/validate — 분석 전에 사진만 검사한다 (Gemini 호출 없음). plan 0009 P2 · F03.

Figma 의 "선택 사진 확인" 화면이 "얼굴 확인 / 한 명 / 크기 충분" 을 체크로 보여주려면
서버가 검사 결과를 데이터로 줘야 한다. 이 엔드포인트는 MediaPipe 만 돌리므로 싸고 빠르다.

주의: 여기서 통과해도 Gemini 가 거부할 수 있다 (일러스트·마네킹은 랜드마크가 잡힌다).
그래서 "분석 가능" 을 100% 보증하지 않는다 — 응답의 `checks` 는 검사한 항목만 말한다.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models.schemas import PhotoValidateRequest, PhotoValidateResponse
from services import mediapipe_service

router = APIRouter()


@router.post("/photos/validate", response_model=PhotoValidateResponse)
async def validate_photo(
    body: PhotoValidateRequest,
    request: Request,
    principal: Principal = Depends(get_principal),
):
    rate_limit.consume("validate", principal, request)
    check = mediapipe_service.inspect_image(body.image)
    return PhotoValidateResponse(
        ok=check.code is None,
        code=check.code,
        message=check.message,
        checks={
            "imageDecoded": check.decoded,
            "faceDetected": check.face_count >= 1,
            "singleFace": check.face_count == 1,
            "faceLargeEnough": bool(check.face_large_enough),
        },
        faceCount=check.face_count,
    )
