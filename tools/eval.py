"""
골든셋 평가 — Gemini analyzeFace 회귀 + 수치 통합 효과 측정

Phase 1 — 1-7 / 1-2 검증.

두 모드를 비교한다:
  Mode A: 이미지만 → Gemini analyzeFace (현재 운영 모드)
  Mode B: 이미지 + faceRatios → Gemini analyzeFace (수치 통합 모드)

각 모드에서 N회 호출해 변동성도 같이 본다.

두 축을 채점한다:
  얼굴형 — 골든셋 expectedFaceType 대비 정확/인접/빗나감 (이 파일)
  features — 수율·커버리지·안정성·어휘·정합성 (`score_features.py`, 라벨 없이도 측정)
             골든셋 item 에 expectedFeatures/forbiddenFeatures 를 넣으면 정확도까지 계산한다.

사용법:
    python tools/eval.py                  # 기본 (golden-set.json, runs=2)
    python tools/eval.py --runs 3
    python tools/eval.py --mode A         # A만 돌림
    python tools/eval.py -o report.json   # 결과 저장

전제:
  - tools/.venv 활성화 (mediapipe + cv2)
  - 프로젝트 루트의 .env 에 VITE_GEMINI_API_KEY=...
  - tools/golden-set.json 의 expectedFaceType 채워져 있음 (null이면 정확도 미계산)
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

# landmark.py 재사용 (compute_ratios + imread + landmarker)
sys.path.insert(0, str(Path(__file__).parent))
from landmark import (  # noqa: E402
    compute_ratios,
    imread_unicode,
    make_landmarker,
)
import cv2  # noqa: E402
import mediapipe as mp  # noqa: E402

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = PROJECT_ROOT / ".env"
GOLDEN_SET_PATH = Path(__file__).parent / "golden-set.json"
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

# ANALYZE_PROMPT 는 backend/services/rag_service.py 가 단일 소스다.
# 사본을 두면 조용히 어긋나 회귀 평가가 운영과 다른 프롬프트를 재게 된다
# (실제로 그랬다 — 사본이 실사 판별·무드·정합성 규칙이 빠진 옛 버전에 멈춰 있었다).
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
from services.rag_service import ANALYZE_PROMPT  # noqa: E402

# features 축 채점은 /eval-face 스킬과 공유한다 (같은 이유로 사본을 두지 않는다).
from score_features import load_entries as load_feature_entries  # noqa: E402
from score_features import render_report as render_feature_report  # noqa: E402
from score_features import score as score_features_axis  # noqa: E402


def load_env() -> str:
    if not ENV_PATH.exists():
        sys.exit(f".env 없음: {ENV_PATH}")
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("VITE_GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip()
            if key:
                return key
    sys.exit("VITE_GEMINI_API_KEY 가 .env 에 없습니다.")


def build_prompt(face_ratios: dict | None) -> str:
    if not face_ratios:
        return ANALYZE_PROMPT
    ratios_block = (
        "[참고 지표 — MediaPipe 측정]\n"
        "아래 수치는 정면 사진에서 추출한 얼굴 랜드마크 비율입니다. "
        "**참고용**일 뿐 절대 기준이 아닙니다.\n"
        "이미지 관찰을 우선으로 하고, 수치는 모호한 경계를 판단할 때만 보조로 활용하세요.\n\n"
        + json.dumps(face_ratios, indent=2, ensure_ascii=False)
    )
    return ratios_block + "\n\n" + ANALYZE_PROMPT


_last_call_at = [0.0]
MIN_INTERVAL_SEC = 6.5  # 10 RPM 안전 (free tier 한도)


def _throttle():
    elapsed = time.time() - _last_call_at[0]
    if elapsed < MIN_INTERVAL_SEC:
        time.sleep(MIN_INTERVAL_SEC - elapsed)
    _last_call_at[0] = time.time()


def call_gemini(api_key: str, image_path: Path, face_ratios: dict | None,
                max_retries: int = 3) -> dict:
    image_bytes = image_path.read_bytes()
    b64 = base64.b64encode(image_bytes).decode("ascii")
    mime = "image/jpeg" if image_path.suffix.lower() in (".jpg", ".jpeg") else "image/png"

    body = json.dumps({
        "contents": [{
            "parts": [
                {"inlineData": {"mimeType": mime, "data": b64}},
                {"text": build_prompt(face_ratios)},
            ]
        }],
        "generationConfig": {"responseMimeType": "application/json"},
    }).encode("utf-8")

    last_err = "unknown"
    for attempt in range(max_retries):
        _throttle()
        req = urllib.request.Request(
            f"{GEMINI_URL}?key={api_key}",
            data=body,
            headers={"content-type": "application/json"},
        )
        started = time.time()
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - started
            text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            m = re.search(r"\{[\s\S]*\}", text)
            if not m:
                return {"error": "응답 JSON 파싱 실패", "raw": text[:200], "elapsed": elapsed}
            try:
                parsed = json.loads(m.group(0))
            except json.JSONDecodeError as e:
                return {"error": f"JSON parse: {e}", "raw": text[:200], "elapsed": elapsed}
            return {
                "faceType": parsed.get("faceType"),
                "features": parsed.get("features", []),
                "responseError": parsed.get("error"),
                "elapsed": round(elapsed, 2),
            }
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace")[:200]
            last_err = f"HTTP {e.code}: {body_text}"
            if e.code in (429, 503) and attempt + 1 < max_retries:
                wait = (2 ** attempt) * 15  # 15s, 30s, 60s
                print(f"    HTTP {e.code} → {wait}s 대기 후 재시도 ({attempt+2}/{max_retries})", flush=True)
                time.sleep(wait)
                continue
            return {"error": last_err}
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
            if attempt + 1 < max_retries:
                time.sleep(5)
                continue
            return {"error": last_err}
    return {"error": last_err}


def extract_ratios(image_path: Path, landmarker) -> dict | None:
    image = imread_unicode(image_path)
    if image is None:
        return None
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect(mp_image)
    if not result.face_landmarks:
        return None
    return compute_ratios(result.face_landmarks[0], image.shape)


def evaluate(api_key: str, gset: dict, runs: int, modes: list[str]) -> list[dict]:
    images_dir = (PROJECT_ROOT / gset["imagesDir"]).resolve()
    landmarker = make_landmarker()
    results: list[dict] = []
    try:
        for item in gset["items"]:
            file_path = images_dir / item["file"]
            print(f"[{item['file']}]", flush=True)
            if not file_path.exists():
                results.append({"file": item["file"], "error": f"파일 없음: {file_path}"})
                continue

            ratios = extract_ratios(file_path, landmarker)
            if not ratios:
                results.append({"file": item["file"], "error": "얼굴 검출 실패"})
                continue

            row: dict = {
                "file": item["file"],
                "expectedFaceType": item.get("expectedFaceType"),
                "expectedAlternatives": item.get("expectedAlternatives", []),
                "faceRatios": ratios,
                "modes": {},
            }
            for mode in modes:
                use_ratios = ratios if mode == "B" else None
                runs_results = []
                for i in range(runs):
                    print(f"  Mode {mode} run {i+1}/{runs}...", end=" ", flush=True)
                    r = call_gemini(api_key, file_path, use_ratios)
                    runs_results.append(r)
                    print(f"→ {r.get('faceType') or r.get('error', '?')} ({r.get('elapsed', 0)}s)", flush=True)
                row["modes"][mode] = runs_results
            results.append(row)
    finally:
        landmarker.close()
    return results


def summarize(results: list[dict], modes: list[str]) -> dict:
    summary = {m: {"hits": 0, "near": 0, "miss": 0, "ambiguous": 0, "errors": 0,
                    "consistent": 0, "total_runs": 0} for m in modes}

    for row in results:
        if "error" in row:
            for m in modes:
                summary[m]["errors"] += 1
            continue
        expected = row.get("expectedFaceType")
        alternatives = set(row.get("expectedAlternatives") or [])
        if expected:
            alternatives.add(expected)
        for m in modes:
            face_types = []
            for r in row["modes"][m]:
                if r.get("error") or r.get("responseError"):
                    summary[m]["errors"] += 1
                    continue
                ft = r.get("faceType")
                face_types.append(ft)
                summary[m]["total_runs"] += 1
                if ft == "판정 어려움":
                    summary[m]["ambiguous"] += 1
                    continue
                if expected:
                    if ft == expected:
                        summary[m]["hits"] += 1
                    elif ft in alternatives:
                        summary[m]["near"] += 1
                    else:
                        summary[m]["miss"] += 1
            if face_types and len(set(face_types)) == 1:
                summary[m]["consistent"] += 1
    return summary


def render_table(results: list[dict], modes: list[str]) -> str:
    lines = []
    headers = ["file", "expected"] + [f"Mode {m}" for m in modes]
    lines.append(" | ".join(f"{h:<14}" for h in headers))
    lines.append("-+-".join("-" * 14 for _ in headers))
    for row in results:
        if "error" in row:
            lines.append(f"{row['file']:<14} | ERROR: {row['error']}")
            continue
        cols = [row["file"], row.get("expectedFaceType") or "(미입력)"]
        for m in modes:
            faces = []
            for r in row["modes"][m]:
                if r.get("error"):
                    faces.append("✗ERR")
                elif r.get("responseError"):
                    faces.append(f"✗{r['responseError'][:8]}")
                else:
                    ft = r.get("faceType") or "?"
                    expected = row.get("expectedFaceType")
                    alts = row.get("expectedAlternatives") or []
                    if expected and ft == expected:
                        faces.append(f"✓{ft}")
                    elif expected and ft in alts:
                        faces.append(f"~{ft}")
                    elif ft == "판정 어려움":
                        faces.append("?판정")
                    elif expected:
                        faces.append(f"✗{ft}")
                    else:
                        faces.append(ft)
            cols.append(", ".join(faces))
        lines.append(" | ".join(f"{c:<14}" if i < 2 else c for i, c in enumerate(cols)))
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Gemini analyzeFace 골든셋 평가")
    parser.add_argument("--runs", type=int, default=2, help="모드별 호출 횟수 (기본 2)")
    parser.add_argument("--mode", choices=["A", "B", "AB"], default="AB",
                        help="A=이미지만, B=이미지+수치, AB=둘 다")
    parser.add_argument("--golden", type=Path, default=GOLDEN_SET_PATH,
                        help="골든셋 JSON 경로")
    parser.add_argument("-o", "--output", type=Path, help="결과 JSON 저장 경로")
    args = parser.parse_args()

    api_key = load_env()
    gset = json.loads(args.golden.read_text(encoding="utf-8"))
    modes = list(args.mode)

    print(f"평가 시작 — model={GEMINI_MODEL}, runs={args.runs}, modes={modes}\n")
    results = evaluate(api_key, gset, args.runs, modes)
    summary = summarize(results, modes)

    print("\n=== 결과 표 ===")
    print(render_table(results, modes))
    print("\n=== 요약 ===")
    for m in modes:
        s = summary[m]
        labeled = s["hits"] + s["near"] + s["miss"]
        rate = f"{s['hits']}/{labeled}" if labeled else "(미라벨)"
        print(
            f"Mode {m}: 정확={s['hits']}, 인접={s['near']}, 빗나감={s['miss']}, "
            f"판정어려움={s['ambiguous']}, 에러={s['errors']}, "
            f"일관성(같은입력 N회 동일)={s['consistent']}, 정확도={rate}"
        )

    # features 축 — 얼굴형과 달리 라벨이 없어도 수율·커버리지·안정성·어휘·정합성은 재진다.
    features_summary = {}
    for m in modes:
        entries = load_feature_entries({"results": results}, mode=m, golden=gset)
        if not entries:
            continue
        scored = score_features_axis(entries)
        features_summary[m] = scored["summary"]
        print(f"\n=== features 축 — Mode {m} ===")
        print(render_feature_report(scored))

    output = {"model": GEMINI_MODEL, "runs": args.runs, "modes": modes,
              "results": results, "summary": summary,
              "featuresSummary": features_summary}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n저장: {args.output}")


if __name__ == "__main__":
    main()
