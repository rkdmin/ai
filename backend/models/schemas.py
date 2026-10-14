"""
Pydantic 요청/응답 스키마.
docs/decisions/0003-phase2-backend-split.md 의 인터페이스 정의를 준수한다.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

# 분석 결과 JSON 의 모양 버전. analyses.schema_version 에 저장되고 응답 schemaVersion 으로 나간다.
#   1 — 컬럼(face_type/features)만 저장. 무드 없음. result JSON 없음. (2026-10 이전 행)
#   2 — result JSON + mood_archetype 저장. 저장본에서 무드가 복원된다.
# 모양을 바꾸면 번호를 올리고 supabase_service.analysis_from_row 의 adapter 에 분기를 추가한다.
# 구버전 행을 새 모양으로 "지어내서" 채우지 않는다 — 없는 값은 없다고 표현한다 (ADR 0010, plan 0009 P1).
ANALYSIS_SCHEMA_VERSION = 2


class AnalyzeRequest(BaseModel):
    frontImage: str = Field(..., description="data URL 또는 순수 base64 (정면 사진)")
    personalColor: str | None = None


class AnalyzeResponse(BaseModel):
    faceType: str
    features: list[str]
    moodArchetype: list[str] = []  # 8개 키워드 중 3개 (퍼블리시티권 회피 — 연예인 레퍼런스 대체)
    faceRatios: dict | None = None
    # 얼굴형 판정 근거. 모델이 결론을 먼저 뱉고 근거를 끼워맞추지 않도록 프롬프트에서
    # faceType 보다 **먼저** 채우게 한다 — 이 단계 추론 강제가 정확도를 올린다 (ADR 0009).
    # 진단용이라 UI 에 노출하지 않고 DB 에도 저장하지 않는다.
    faceTypeReason: dict | None = None
    analysisId: str | None = None  # Phase 3 (Supabase) 에서 발급
    schemaVersion: int = ANALYSIS_SCHEMA_VERSION


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
    detail: str
    code: str | None = None  # models/errors.py 의 코드. 코드가 붙은 에러만 채워진다


class PhotoValidateRequest(BaseModel):
    image: str = Field(..., description="data URL 또는 순수 base64")


class PhotoValidateResponse(BaseModel):
    """POST /api/photos/validate — Gemini 없이 MediaPipe 검사만 한 결과 (F03)."""
    ok: bool
    code: str | None = None       # ok=False 일 때 사진 코드 (INVALID_IMAGE / NO_FACE / MULTIPLE_FACES / FACE_TOO_SMALL)
    message: str | None = None
    checks: dict[str, bool]       # imageDecoded / faceDetected / singleFace / faceLargeEnough
    faceCount: int = 0


class HistorySaveRequest(BaseModel):
    analysisId: str
    cardType: str
    cardData: dict | list[dict]


class HistoryListItem(BaseModel):
    analysisId: str
    faceType: str
    personalColor: str | None = None
    moodArchetype: list[str] = []  # schema v1 행은 빈 배열 (legacy=True)
    cardTypes: list[str] = []
    createdAt: datetime
    photoExpired: bool
    schemaVersion: int = 1
    legacy: bool = False  # True 면 저장 당시 모양이 현재와 달라 일부 필드가 비어 있다


class HistoryDetailResponse(BaseModel):
    analysis: dict
    cards: list[dict] = []
    generatedPhotos: list[dict] = []
