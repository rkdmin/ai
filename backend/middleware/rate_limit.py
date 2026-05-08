"""
인메모리 Rate Limit (Phase 2).

Phase 3 에서 Supabase `usage_counters` 또는 Redis 로 교체한다.
서버 재시작 시 카운터가 초기화되며, 멀티 인스턴스 배포에는 적합하지 않다.

엔드포인트별 한도:
  /api/analyze  : 게스트 1/일,  로그인 5/일
  /api/cards/*  : 게스트 3/일 (3종 합산), 로그인 15/일 (3종 합산)
  /api/photo/*  : 게스트 0 (auth 단에서 401), 로그인 5/일

`(scope, key, day)` 단위로 카운터를 관리한다.
- scope: 엔드포인트 그룹 ('analyze' | 'cards' | 'photo')
- key  : 게스트는 'ip:<ip>', 로그인은 'user:<id>'
- day  : UTC 기준 YYYY-MM-DD
"""
from __future__ import annotations

import os
import threading
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException, Request

from middleware.auth import Principal

LIMITS = {
    "analyze": {"guest": 1, "user": 5},
    "cards":   {"guest": 3, "user": 15},
    "photo":   {"guest": 0, "user": 5},
}

_counts: dict[tuple[str, str, str], int] = defaultdict(int)
_lock = threading.Lock()


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _client_ip(request: Request) -> str:
    # 프록시 뒤에 있을 때 — Render/Railway 모두 X-Forwarded-For 를 채운다.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _bucket_key(principal: Principal, request: Request) -> str:
    if principal.is_guest:
        return f"ip:{_client_ip(request)}"
    return f"user:{principal.user_id}"


def consume(scope: str, principal: Principal, request: Request) -> None:
    """
    호출 카운트를 1 증가시키고, 한도 초과 시 429 를 던진다.
    photo 스코프는 게스트가 도달하기 전에 require_user 가 401 로 거부한다.

    `RATE_LIMIT_DISABLED=true` 환경변수가 설정되면 전체 우회 — 로컬 개발 전용.
    운영 환경(Render/Railway)에는 절대 설정하지 말 것.
    """
    if os.getenv("RATE_LIMIT_DISABLED", "").lower() == "true":
        return

    limit_table = LIMITS[scope]
    limit = limit_table["guest" if principal.is_guest else "user"]

    bucket = _bucket_key(principal, request)
    day = _today_utc()
    key = (scope, bucket, day)

    with _lock:
        current = _counts[key]
        if current >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"오늘 {scope} 사용량({limit}회)을 모두 사용했어요. 내일 다시 시도해주세요.",
            )
        _counts[key] = current + 1


def reset_all() -> None:
    """테스트 헬퍼."""
    with _lock:
        _counts.clear()
