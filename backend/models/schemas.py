"""
Pydantic 요청/응답 스키마.
docs/phase2-backend.md 의 인터페이스 정의를 준수한다.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    frontImage: str = Field(..., description="data URL 또는 순수 base64 (정면 사진)")
    personalColor: str | None = None


class AnalyzeResponse(BaseModel):
    faceType: str
    features: list[str]
    moodArchetype: list[str] = []  # 8개 키워드 중 3개 (퍼블리시티권 회피 — 연예인 레퍼런스 대체)
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
    frontImage: str | None = None  # 게스트/로컬 폴백. 로그인 유저는 Storage 원본 사용 가능.


class PhotoResponse(BaseModel):
    generatedImage: str
    cached: bool = False


class ErrorResponse(BaseModel):
    error: str


class HistorySaveRequest(BaseModel):
    analysisId: str
    cardType: str
    cardData: dict | list[dict]


class HistoryListItem(BaseModel):
    analysisId: str
    faceType: str
    personalColor: str | None = None
    cardTypes: list[str] = []
    createdAt: datetime
    photoExpired: bool


class HistoryDetailResponse(BaseModel):
    analysis: dict
    cards: list[dict] = []
    generatedPhotos: list[dict] = []
