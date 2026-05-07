"""
MediaPipe Face Landmarker → 얼굴 비율 추출

Phase 1 — 로컬 평가용 스크립트.
Phase 2에서 backend/services/mediapipe_service.py 로 이관 가능한 형태로 작성.

사용법:
    python tools/landmark.py path/to/photo.jpg
    python tools/landmark.py path/to/folder/         # 디렉토리 일괄
    python tools/landmark.py photo.jpg -o out.json   # 파일 저장

출력 (단일 이미지):
    {
      "file": "...",
      "faceRatios": {
        "foreheadRatio": 0.95, "jawRatio": 0.82, "aspectRatio": 1.35,
        "jawAngle": 130.5,
        "upperFaceRatio": 0.32, "midFaceRatio": 0.34, "lowerFaceRatio": 0.34,
        "eyeGapRatio": 0.34, "eyeOpennessRatio": 0.05, "lipWidthRatio": 0.42
      }
    }

랜드마크 ID는 MediaPipe Face Landmarker 정규 모델(478점) 기준.
골든셋 회귀에서 어색한 값이 나오면 LANDMARKS 매핑만 조정하면 된다.

첫 실행 시 face_landmarker.task 모델 파일(~3.7MB)을 tools/.cache/ 로
자동 다운로드한다.
"""

from __future__ import annotations

import argparse
import json
import sys
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
MODEL_DIR = Path(__file__).parent / ".cache"
MODEL_PATH = MODEL_DIR / "face_landmarker.task"

# ── MediaPipe Face Landmarker canonical landmark IDs ────────────────
LANDMARKS = {
    # 얼굴형 분류용
    "forehead_top": 10,        # 이마 상단 (얼굴 길이 시작)
    "chin": 152,               # 턱 끝 (얼굴 길이 끝)
    "cheek_left": 234,         # 광대 좌 (관찰자 시점)
    "cheek_right": 454,        # 광대 우
    "forehead_left": 54,       # 이마폭 좌
    "forehead_right": 284,     # 이마폭 우
    "jaw_left": 172,           # 턱폭 좌
    "jaw_right": 397,          # 턱폭 우

    # 턱 각도 (사각형/둥근형 구분)
    # mandibular angle = gonial 점에서 (위로 광대) ↔ (아래로 턱끝) 사이 각도.
    # phase1 doc은 ramus 점으로 #58/#288을 제시했으나 실측 결과 132/58, 361/288은 너무 가까워
    # 의미 있는 각도가 안 나옴. cheek_left/right(234/454)을 위쪽 anchor로 사용.
    "gonial_left": 132,        # 좌측 턱각 꼭짓점
    "gonial_right": 361,       # 우측 턱각 꼭짓점

    # 상·중·하안부
    "glabella": 9,             # 미간 (눈썹선 대용)
    "subnasal": 2,             # 코밑 (중안부 끝)

    # 이목구비 특징
    "eye_inner_left": 133,
    "eye_inner_right": 362,
    "eye_top_left": 159,
    "eye_bottom_left": 145,
    "eye_top_right": 386,
    "eye_bottom_right": 374,
    "lip_corner_left": 61,
    "lip_corner_right": 291,
}


def ensure_model() -> Path:
    if MODEL_PATH.exists():
        return MODEL_PATH
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"모델 다운로드: {MODEL_URL}", file=sys.stderr)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print(f"저장: {MODEL_PATH}", file=sys.stderr)
    return MODEL_PATH


def get_xy(landmarks, image_shape, name):
    h, w = image_shape[:2]
    p = landmarks[LANDMARKS[name]]
    return np.array([p.x * w, p.y * h], dtype=np.float64)


def dist(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def angle_at(vertex: np.ndarray, p1: np.ndarray, p2: np.ndarray) -> float:
    """vertex 점에서 p1·p2 방향 두 벡터 사이의 각도(도)."""
    v1, v2 = p1 - vertex, p2 - vertex
    denom = np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9
    cos = float(np.clip(np.dot(v1, v2) / denom, -1.0, 1.0))
    return float(np.degrees(np.arccos(cos)))


def compute_ratios(landmarks, image_shape) -> dict:
    """
    핵심 비율값 계산. cheek_width 기준 정규화로 스케일 불변성 확보.
    Gemini에 전달할 때 절대 임계값으로 쓰지 말고 참고지표로만 사용한다.
    """
    g = lambda name: get_xy(landmarks, image_shape, name)

    forehead_w = dist(g("forehead_left"), g("forehead_right"))
    cheek_w = dist(g("cheek_left"), g("cheek_right"))
    jaw_w = dist(g("jaw_left"), g("jaw_right"))
    face_h = dist(g("forehead_top"), g("chin"))

    upper = dist(g("forehead_top"), g("glabella"))
    mid = dist(g("glabella"), g("subnasal"))
    lower = dist(g("subnasal"), g("chin"))

    jaw_angle_l = angle_at(g("gonial_left"), g("cheek_left"), g("chin"))
    jaw_angle_r = angle_at(g("gonial_right"), g("cheek_right"), g("chin"))
    jaw_angle = (jaw_angle_l + jaw_angle_r) / 2

    eye_gap = dist(g("eye_inner_left"), g("eye_inner_right"))
    eye_open = (
        dist(g("eye_top_left"), g("eye_bottom_left"))
        + dist(g("eye_top_right"), g("eye_bottom_right"))
    ) / 2
    lip_w = dist(g("lip_corner_left"), g("lip_corner_right"))

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


def make_landmarker():
    base_options = mp_python.BaseOptions(model_asset_path=str(ensure_model()))
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_faces=1,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )
    return vision.FaceLandmarker.create_from_options(options)


def imread_unicode(path: Path):
    """cv2.imread 는 Windows에서 비-ASCII 경로를 못 읽으므로 우회."""
    try:
        data = np.fromfile(str(path), dtype=np.uint8)
        return cv2.imdecode(data, cv2.IMREAD_COLOR)
    except Exception:
        return None


def analyze_image(image_path: Path, landmarker) -> dict:
    image = imread_unicode(image_path)
    if image is None:
        return {"file": str(image_path), "error": "이미지를 읽을 수 없습니다."}

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if not result.face_landmarks:
        return {"file": str(image_path), "error": "얼굴을 찾을 수 없습니다."}

    ratios = compute_ratios(result.face_landmarks[0], image.shape)
    return {"file": str(image_path), "faceRatios": ratios}


def collect_images(in_path: Path) -> list[Path]:
    if in_path.is_file():
        return [in_path]
    extensions = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
    return sorted(
        p for p in in_path.rglob("*")
        if p.is_file() and p.suffix.lower() in extensions
    )


def main():
    parser = argparse.ArgumentParser(description="MediaPipe Face Landmarker 비율 추출")
    parser.add_argument("input", help="이미지 파일 또는 디렉토리")
    parser.add_argument("-o", "--output", help="결과 저장 JSON 경로 (없으면 stdout)")
    args = parser.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"경로 없음: {in_path}", file=sys.stderr)
        sys.exit(1)

    targets = collect_images(in_path)
    if not targets:
        print(f"이미지 파일이 없습니다: {in_path}", file=sys.stderr)
        sys.exit(1)

    landmarker = make_landmarker()
    try:
        results = [analyze_image(p, landmarker) for p in targets]
    finally:
        landmarker.close()

    output = results[0] if len(results) == 1 else results
    text = json.dumps(output, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"저장: {args.output}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
