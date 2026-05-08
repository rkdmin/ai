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
        num_faces=1,
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


def extract_face_ratios(image_b64: str) -> dict | None:
    """
    이미지에서 faceRatios 를 추출. 얼굴 검출 실패 시 None.
    Gemini는 None 인 경우에도 이미지 분석 자체는 가능하므로 라우터에서 graceful 하게 처리.
    """
    raw = _decode_data_url(image_b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        return None

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

    landmarker = _get_landmarker()
    # FaceLandmarker.detect 는 thread-safe 하지 않으므로 직렬화한다.
    with _lock:
        result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        return None
    return _compute_ratios(result.face_landmarks[0], image.shape)
