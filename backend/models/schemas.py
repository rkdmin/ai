"""
Pydantic 요청/응답 스키마.
docs/phase2-backend.md 의 인터페이스 정의를 준수한다.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    frontImage: str = Field(..., description="data URL 또는 순수 base64 (정면 사진)")


class AnalyzeResponse(BaseModel):
    faceType: str
    features: list[str]
    faceRatios: dict | None = None
    analysisId: str | None = None  # Phase 3 (Supabase) 에서 발급


class CardsRequest(BaseModel):
    analysisId: str | None = None  # Phase 3 에서 cards 테이블 INSERT에 사용
    faceType: str
    personalColor: str | None = None
    features: list[str] = []


class PhotoRequest(BaseModel):
    """
    Phase 2 임시: frontImage 를 요청에 포함한다.
    Phase 3 (Supabase Storage 도입) 부터는 analyses.front_image_url 에서 가져온다.
    """
    analysisId: str | None = None
    cardType: str  # 'hair' | 'total'
    card: dict
    frontImage: str  # Phase 3 제거 예정


class PhotoResponse(BaseModel):
    generatedImage: str
    cached: bool = False


class ErrorResponse(BaseModel):
    error: str
