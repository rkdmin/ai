"""
에러 코드 계약 (plan 0009 P2 · F03).

프론트가 **문자열이 아니라 코드로** 화면을 분기하게 한다. 응답 모양:

    { "detail": "<사람이 읽는 한국어 메시지>", "code": "<아래 코드 중 하나>" }

`detail` 은 기존 프론트(`src/api/backend.js` parseError)가 그대로 읽고, `code` 는 새 화면이 읽는다.
코드를 추가·삭제하면 `.claude/rules/api-contract.md` 의 표를 같은 작업에서 갱신한다.
"""
from __future__ import annotations

from fastapi import HTTPException

# ── 사진·분석 단계 (400) ──────────────────────────────────────────
INVALID_IMAGE = "INVALID_IMAGE"          # 이미지로 디코딩되지 않음 (깨진 파일, 지원하지 않는 형식)
NO_FACE = "NO_FACE"                      # MediaPipe 가 얼굴을 찾지 못함
MULTIPLE_FACES = "MULTIPLE_FACES"        # 얼굴이 2개 이상 — 분석 대상을 자동으로 고르지 않는다
FACE_TOO_SMALL = "FACE_TOO_SMALL"        # 얼굴이 사진에 비해 너무 작음 (이목구비 식별 불가)
UNSUPPORTED_PHOTO = "UNSUPPORTED_PHOTO"  # 모델이 거부 — 일러스트·측면·가림 등. message 에 사유
# ── 서버·AI (429 / 502 / 503) ─────────────────────────────────────
RATE_LIMITED = "RATE_LIMITED"            # 일일 한도 초과
AI_UNAVAILABLE = "AI_UNAVAILABLE"        # 모델 과부하·일시 장애 — 재시도 안내
AI_ERROR = "AI_ERROR"                    # 그 외 모델 호출 실패

PHOTO_CODES = (INVALID_IMAGE, NO_FACE, MULTIPLE_FACES, FACE_TOO_SMALL, UNSUPPORTED_PHOTO)
ALL_CODES = PHOTO_CODES + (RATE_LIMITED, AI_UNAVAILABLE, AI_ERROR)

# 코드별 기본 메시지. 라우트가 더 구체적인 문장을 넘기면 그걸 쓴다.
DEFAULT_MESSAGES: dict[str, str] = {
    INVALID_IMAGE: "사진 파일을 읽을 수 없어요. JPG 또는 PNG 사진으로 다시 올려 주세요.",
    NO_FACE: "사진에서 얼굴을 찾을 수 없어요. 정면 얼굴이 잘 보이는 사진으로 다시 시도해 주세요.",
    MULTIPLE_FACES: "사진에 얼굴이 여러 개 보여요. 분석할 사람 한 명만 나온 사진으로 올려 주세요.",
    FACE_TOO_SMALL: "얼굴이 너무 작게 나왔어요. 얼굴이 화면을 충분히 채우는 사진으로 다시 시도해 주세요.",
    UNSUPPORTED_PHOTO: "이 사진으로는 분석할 수 없어요. 실사 정면 사진으로 다시 시도해 주세요.",
    RATE_LIMITED: "오늘 사용량을 모두 사용했어요. 내일 다시 시도해 주세요.",
    AI_UNAVAILABLE: "분석 서버가 잠시 바빠요. 잠시 후 다시 시도해 주세요.",
    AI_ERROR: "분석에 실패했어요. 잠시 후 다시 시도해 주세요.",
}

STATUS_BY_CODE: dict[str, int] = {
    INVALID_IMAGE: 400,
    NO_FACE: 400,
    MULTIPLE_FACES: 400,
    FACE_TOO_SMALL: 400,
    UNSUPPORTED_PHOTO: 400,
    RATE_LIMITED: 429,
    AI_UNAVAILABLE: 503,
    AI_ERROR: 502,
}


class ApiError(HTTPException):
    """코드가 붙은 HTTPException. main.py 의 핸들러가 {detail, code} 로 직렬화한다."""

    def __init__(self, code: str, message: str | None = None, status_code: int | None = None):
        if code not in ALL_CODES:
            raise ValueError(f"알 수 없는 에러 코드: {code}")
        self.code = code
        super().__init__(
            status_code=status_code or STATUS_BY_CODE[code],
            detail=message or DEFAULT_MESSAGES[code],
        )
