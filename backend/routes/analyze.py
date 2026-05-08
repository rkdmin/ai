"""POST /api/analyze — MediaPipe + Gemini 얼굴 분석."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal
from models.schemas import AnalyzeRequest, AnalyzeResponse
from services import gemini_service, mediapipe_service

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
        raise HTTPException(status_code=400, detail=str(e))

    # Phase 3 자리표시자 — 로그인 유저면 analyses 테이블 INSERT 후 analysisId 발급
    if not principal.is_guest:
        result.setdefault("analysisId", None)

    return result
