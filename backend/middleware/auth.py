"""
사용자 식별 — Phase 2 스텁.

Phase 3 에서 Supabase JWT 검증으로 교체할 예정이다.
지금은 `X-User-Id` 헤더가 있으면 그 값을 user_id 로 받아들이고, 없으면 게스트로 처리한다.
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Header


@dataclass
class Principal:
    """요청을 보낸 주체."""
    user_id: str | None  # None 이면 게스트
    is_guest: bool

    @property
    def key(self) -> str:
        """rate limit 카운터 키. 게스트는 호출자가 IP 로 prefix 한다."""
        return self.user_id or "guest"


def get_principal(x_user_id: str | None = Header(default=None)) -> Principal:
    if x_user_id and x_user_id.strip():
        return Principal(user_id=x_user_id.strip(), is_guest=False)
    return Principal(user_id=None, is_guest=True)


def require_user(x_user_id: str | None = Header(default=None)) -> Principal:
    """로그인 전용 엔드포인트용. 게스트면 401."""
    from fastapi import HTTPException

    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    return Principal(user_id=x_user_id.strip(), is_guest=False)
