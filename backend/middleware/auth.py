"""사용자 식별 — Supabase JWT 우선, 로컬 개발에서는 X-User-Id 폴백."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header, HTTPException

from services import supabase_service


@dataclass
class Principal:
    """요청을 보낸 주체."""
    user_id: str | None  # None 이면 게스트
    is_guest: bool

    @property
    def key(self) -> str:
        """rate limit 카운터 키. 게스트는 호출자가 IP 로 prefix 한다."""
        return self.user_id or "guest"


async def get_principal(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> Principal:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        user = await supabase_service.verify_access_token(token)
        if not user:
            raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
        return Principal(user_id=user["id"], is_guest=False)

    # Supabase 미설정 로컬 개발/테스트 호환. 운영에서는 X-User-Id 를 신뢰하지 않는다.
    if x_user_id and x_user_id.strip() and not supabase_service.configured():
        return Principal(user_id=x_user_id.strip(), is_guest=False)
    return Principal(user_id=None, is_guest=True)


async def require_user(
    authorization: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> Principal:
    """로그인 전용 엔드포인트용. 게스트면 401."""
    principal = await get_principal(authorization=authorization, x_user_id=x_user_id)
    if principal.is_guest:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return principal
