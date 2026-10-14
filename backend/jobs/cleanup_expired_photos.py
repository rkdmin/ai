"""
만료 사진 정리 스크립트 — 하루 한 번 cron 으로 돌린다 (Render/Railway cron job 또는 외부 스케줄러).

    cd backend && .venv/Scripts/python -m jobs.cleanup_expired_photos

환경변수는 backend/.env 를 그대로 쓴다 (SUPABASE_URL, SERVICE_ROLE_KEY, SUPABASE_PHOTO_BUCKET).
같은 일을 HTTP 로 하려면 POST /api/admin/cleanup-expired (X-Admin-Token).
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from services.cleanup_service import cleanup_expired  # noqa: E402


def main() -> int:
    report = asyncio.run(cleanup_expired())
    print(json.dumps(report, ensure_ascii=False))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
