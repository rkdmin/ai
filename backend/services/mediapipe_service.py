"""
MediaPipe Face Landmarker → 얼굴 비율 추출 (백엔드 서비스).
tools/landmark.py 의 핵심 로직(LANDMARKS, compute_ratios, ensure_model)을 그대로 이관하고
HTTP 요청에서 받은 base64 이미지를 입력으로 받도록 어댑터를 추가했다.
"""
from __future__ import annotations

import base64
import sys
import threading
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
MODEL_DIR = Path(__file__).resolve().parent.parent / ".cache"
MODEL_PATH = MODEL_DIR / "face_landmarker.task"

LANDMARKS = {
    "forehead_top": 10,
    "chin": 152,
    "cheek_left": 234,
    "cheek_right": 454,
    "forehead_left": 54,
    "forehead_right": 284,
    "jaw_left": 172,
    "jaw_right": 397,
    "gonial_left": 132,
    "gonial_right": 361,
    "glabella": 9,
    "subnasal": 2,
    "eye_inner_left": 133,
    "eye_inner_right": 362,
    "eye_top_left": 159,
    "eye_bottom_left": 145,
    "eye_top_right": 386,
    "eye_bottom_right": 374,
    "lip_corner_left": 61,
    "lip_corner_right": 291,
}

_landmarker = None
_lock = threading.Lock()

# 사진 검사 기준 (F03). 얼굴 폭 = 양쪽 광대(cheek_left~cheek_right) 거리.
# 이미지 폭 대비 비율과 절대 픽셀 둘 다 봐야 한다 — 작은 이미지는 비율은 크고 픽셀은 모자란다.
MAX_FACES = 3                   # 이보다 많아도 "여러 명" 으로만 알린다. 셀 필요는 없다.
MIN_FACE_WIDTH_RATIO = 0.12     # 광대 폭 / 이미지 폭
MIN_FACE_WIDTH_PX = 96


@dataclass
class PhotoCheck:
    """inspect_image 의 결과. code 가 None 이면 분석에 넘겨도 되는 사진이다."""
    decoded: bool
    face_count: int
    face_large_enough: bool | None     # 얼굴이 없으면 None
    face_ratios: dict | None           # 얼굴이 정확히 1개일 때만 채운다
    code: str | None                   # models.errors 의 사진 코드 또는 None
    message: str | None


def _ensure_model() -> Path:
    if MODEL_PATH.exists():
        return MODEL_PATH
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"[mediapipe] 모델 다운로드: {MODEL_URL}", file=sys.stderr)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"[mediapipe] 저장: {MODEL_PATH}", file=sys.stderr)
    return MODEL_PATH


def _make_landmarker():
    base_options = mp_python.BaseOptions(model_asset_path=str(_ensure_model()))
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=MAX_FACES,  # 여러 명을 걸러내려면 2개 이상을 볼 수 있어야 한다 (F03)
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )
    return vision.FaceLandmarker.create_from_options(options)


def warmup() -> None:
    """앱 부팅 시 모델 로드. 첫 요청 레이턴시 감소용."""
    global _landmarker
    with _lock:
        if _landmarker is None:
            _landmarker = _make_landmarker()


def _get_landmarker():
    global _landmarker
    if _landmarker is None:
        with _lock:
            if _landmarker is None:
                _landmarker = _make_landmarker()
    return _landmarker


def _get_xy(landmarks, image_shape, name: str) -> np.ndarray:
    h, w = image_shape[:2]
    p = landmarks[LANDMARKS[name]]
    return np.array([p.x * w, p.y * h], dtype=np.float64)


def _dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _angle_at(vertex: np.ndarray, p1: np.ndarray, p2: np.ndarray) -> float:
    v1, v2 = p1 - vertex, p2 - vertex
    denom = np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9
    cos = float(np.clip(np.dot(v1, v2) / denom, -1.0, 1.0))
    return float(np.degrees(np.arccos(cos)))


def _compute_ratios(landmarks, image_shape) -> dict:
    g = lambda name: _get_xy(landmarks, image_shape, name)

    forehead_w = _dist(g("forehead_left"), g("forehead_right"))
    cheek_w = _dist(g("cheek_left"), g("cheek_right"))
    jaw_w = _dist(g("jaw_left"), g("jaw_right"))
    face_h = _dist(g("forehead_top"), g("chin"))

    upper = _dist(g("forehead_top"), g("glabella"))
    mid = _dist(g("glabella"), g("subnasal"))
    lower = _dist(g("subnasal"), g("chin"))

    jaw_angle_l = _angle_at(g("gonial_left"), g("cheek_left"), g("chin"))
    jaw_angle_r = _angle_at(g("gonial_right"), g("cheek_right"), g("chin"))
    jaw_angle = (jaw_angle_l + jaw_angle_r) / 2

    eye_gap = _dist(g("eye_inner_left"), g("eye_inner_right"))
    eye_open = (
        _dist(g("eye_top_left"), g("eye_bottom_left"))
        + _dist(g("eye_top_right"), g("eye_bottom_right"))
    ) / 2
    lip_w = _dist(g("lip_corner_left"), g("lip_corner_right"))

    return {
        "foreheadRatio": round(forehead_w / cheek_w, 4),
        "jawRatio": round(jaw_w / cheek_w, 4),
        "aspectRatio": round(face_h / cheek_w, 4),
        "jawAngle": round(jaw_angle, 2),
        "upperFaceRatio": round(upper / face_h, 4),
        "midFaceRatio": round(mid / face_h, 4),
        "lowerFaceRatio": round(lower / face_h, 4),
        "eyeGapRatio": round(eye_gap / cheek_w, 4),
        "eyeOpennessRatio": round(eye_open / cheek_w, 4),
        "lipWidthRatio": round(lip_w / cheek_w, 4),
    }


def _decode_data_url(image_b64: str) -> bytes:
    """`data:image/jpeg;base64,...` 또는 순수 base64 어느 쪽이든 허용."""
    if image_b64.startswith("data:"):
        image_b64 = image_b64.split(",", 1)[1]
    return base64.b64decode(image_b64)


def _face_width_px(landmarks, image_shape) -> float:
    return _dist(
        _get_xy(landmarks, image_shape, "cheek_left"),
        _get_xy(landmarks, image_shape, "cheek_right"),
    )


def inspect_image(image_b64: str) -> PhotoCheck:
    """
    사진을 검사해 코드로 답한다 (F03). Gemini 를 부르지 않는다.

    순서: 디코딩 → 얼굴 수 → 얼굴 크기. 먼저 걸리는 것 하나만 코드로 낸다.
    실사 여부(일러스트·마네킹)는 여기서 못 거른다 — 그건 ANALYZE_PROMPT 의 거부 조건이 맡는다.
    """
    # 지연 import — mediapipe_service 는 models 에 의존하지 않는 게 원칙이나 코드 상수는 공유해야 한다.
    from models import errors

    try:
        raw = _decode_data_url(image_b64)
    except Exception:
        return PhotoCheck(False, 0, None, None, errors.INVALID_IMAGE, errors.DEFAULT_MESSAGES[errors.INVALID_IMAGE])
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        return PhotoCheck(False, 0, None, None, errors.INVALID_IMAGE, errors.DEFAULT_MESSAGES[errors.INVALID_IMAGE])

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    landmarker = _get_landmarker()
    # FaceLandmarker.detect 는 thread-safe 하지 않으므로 직렬화한다.
    with _lock:
        result = landmarker.detect(mp_image)

    faces = result.face_landmarks or []
    if not faces:
        return PhotoCheck(True, 0, None, None, errors.NO_FACE, errors.DEFAULT_MESSAGES[errors.NO_FACE])
    if len(faces) > 1:
        return PhotoCheck(True, len(faces), None, None, errors.MULTIPLE_FACES, errors.DEFAULT_MESSAGES[errors.MULTIPLE_FACES])

    width_px = _face_width_px(faces[0], image.shape)
    image_w = image.shape[1]
    large_enough = width_px >= MIN_FACE_WIDTH_PX and (width_px / max(image_w, 1)) >= MIN_FACE_WIDTH_RATIO
    if not large_enough:
        return PhotoCheck(True, 1, False, None, errors.FACE_TOO_SMALL, errors.DEFAULT_MESSAGES[errors.FACE_TOO_SMALL])

    return PhotoCheck(True, 1, True, _compute_ratios(faces[0], image.shape), None, None)


def extract_face_ratios(image_b64: str) -> dict | None:
    """
    이미지에서 faceRatios 를 추출. 얼굴이 정확히 1개이고 충분히 클 때만 값, 아니면 None.
    tools/ 와 구 호출자를 위한 호환 래퍼 — 라우트는 inspect_image 를 써서 코드를 받는다.
    """
    return inspect_image(image_b64).face_ratios
