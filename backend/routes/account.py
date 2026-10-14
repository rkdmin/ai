"""
계정 데이터 삭제 + 보관 정책 조회 (plan 0009 P1 → F12 선행).

DELETE /api/account        — 로그인 사용자의 분석·카드·생성 사진·Storage 원본·auth 계정을 지운다.
GET    /api/account/policy — 사진 보관 기간 등 안내 문구가 참조할 실제 정책 값.

지금까지 앱의 "계정 삭제" 는 alert 만 띄웠다 (My.jsx). 이 엔드포인트가 실제 삭제다.
게스트는 서버에 데이터가 없으므로 401 — 기기 저장본 삭제는 프론트 몫이다.
부분 실패는 200 + ok=false 로 돌려준다. 클라이언트가 다시 호출하면 남은 것만 지운다 (멱등).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from middleware.auth import Principal, require_user
from models.schemas import AccountDeleteResponse, AccountPolicyResponse
from services import supabase_service

router = APIRouter()


@router.get("/account/policy", response_model=AccountPolicyResponse)
async def account_policy():
    return AccountPolicyResponse(
        photoRetentionDays=supabase_service.PHOTO_RETENTION_DAYS,
        generatedPhotoRetentionDays=supabase_service.GENERATED_PHOTO_RETENTION_DAYS,
        guestPhotoStored=False,
    )


@router.delete("/account", response_model=AccountDeleteResponse)
async def delete_account(principal: Principal = Depends(require_user)):
    report = await supabase_service.delete_user_data(principal.user_id)
    return AccountDeleteResponse(ok=not report["errors"], **report)
