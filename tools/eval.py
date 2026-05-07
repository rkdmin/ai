"""
골든셋 평가 — Gemini analyzeFace 회귀 + 수치 통합 효과 측정

Phase 1 — 1-7 / 1-2 검증.

두 모드를 비교한다:
  Mode A: 이미지만 → Gemini analyzeFace (현재 운영 모드)
  Mode B: 이미지 + faceRatios → Gemini analyzeFace (수치 통합 모드)

각 모드에서 N회 호출해 변동성도 같이 본다.

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

# ⚠️ src/utils/ragUtils.js 의 ANALYZE_PROMPT 와 동기 유지.
# Phase 1-2 프롬프트 변경 시 양쪽을 같이 고친다.
ANALYZE_PROMPT = """당신은 뷰티 전문가입니다. 다른 텍스트는 절대 포함하지 마세요.

## 우선 검사 — 분석 불가 판정
아래 조건 중 하나라도 해당되면, 다른 분석 없이 이 형식으로만 응답하세요:
{"error": "사유를 한 문장으로"}

거부 조건:
- 사람 얼굴이 없는 경우 (동물, 사물, 음식, 풍경, 텍스트 이미지 등)
- 얼굴이 너무 작거나 흐려서 이목구비를 식별할 수 없는 경우
- 측면·뒷모습으로 정면 분석이 불가능한 경우
- 마스크·선글라스 등으로 얼굴이 절반 이상 가려진 경우
- 여러 사람이 있어 분석 대상을 특정할 수 없는 경우

위 조건에 해당하지 않으면 아래 JSON으로 응답하세요:

{
  "faceType": "계란형 | 둥근형 | 사각형 | 하트형 | 긴형 | 다이아몬드형 | 땅콩형 | 판정 어려움 중 하나",
  "features": ["확실히 보이는 특징만, 0개도 가능"]
}

## 분석 원칙 (반드시 준수)
- **확실한 것만 포함**: 사진을 보고 즉시 "이건 확실하다"고 판단되는 것만 포함하세요.
- **애매하면 제외**: "아마도", "~인 것 같다", "~일 수도 있다" 수준이면 포함하지 마세요.
- **억지로 채우지 말 것**: 목록을 채우기 위해 불확실한 항목을 넣는 것은 잘못된 분석입니다. 빈 배열([])도 정답입니다.

---

## 얼굴형 판단 기준

### 분류 우선순위 (위에서부터 순서대로 검사)
1. **사각형/땅콩형 검사 — 턱 모서리(gonial 코너) 각짐 우선**
   - 턱 좌우 모서리가 직선적으로 각져 있으면 우선 사각/땅콩 후보
   - 턱끝의 모양(V/U)이나 얼굴 길이는 무관 — 짧은 사각, 긴 사각, V턱 사각 모두 포함
   - 광대까지 발달했으면 땅콩형, 광대 부드러우면 사각형
2. **하트형/다이아몬드형 검사 — 광대가 가장 넓은가**
   - 광대 폭이 이마·턱보다 명확히 넓으면 후보
   - 이마도 넓으면 하트형, 이마·턱 모두 좁으면 다이아몬드형
3. **긴형 검사 — 세로 길이 압도적**
   - 위에 해당 안 되고 세로/가로 비율이 1.4 이상으로 명확히 길면 긴형
4. **계란형/둥근형** (위 모두 해당 안 됨)
   - 골격 특징 약하고 부드러우면 — 길이 적당하면 계란형, 둥근편이면 둥근형

### 형별 정의
- 계란형: 이마가 약간 넓고 턱으로 갈수록 자연스럽게 좁아지는 형태. **gonial 코너 부드러움**.
- 둥근형: 얼굴 폭과 길이가 비슷하고 전체 윤곽이 부드럽고 볼살이 있는 형태. gonial 코너 부드러움.
- 사각형: **턱 좌우 모서리(gonial 코너)가 직선적으로 각져 있는 형태**. 광대 아래에서 턱 모서리까지 이어지는 라인이 곡선이 아닌 직선적·모서리가 뚜렷함. 턱끝은 V/U/사각 어느 형태든 무관. 얼굴 길이도 무관 (짧은 사각/긴 사각 모두 포함).
- 하트형: 이마·광대가 넓고 턱 끝이 뾰족하게 좁아지는 형태. gonial 부드러움.
- 긴형: 얼굴 세로 길이가 가로 폭보다 확연히 긴 형태. gonial 부드러움 (각지면 사각형으로).
- 다이아몬드형: 옆광대가 가장 넓고 이마와 턱이 모두 좁은 형태. gonial 부드러움.
- 땅콩형: **gonial 코너 각짐 + 광대도 발달**. 볼이 살짝 패여 라인이 울퉁불퉁.

### 경계형 처리 — "판정 어려움"
두 얼굴형 사이 경계(예: 다이아몬드/하트, 땅콩/사각, 계란/긴)에서 어느 쪽으로도 80% 이상 확신할 수 없다면 "판정 어려움"으로 응답하세요.
이 값은 사용자가 어느 한 쪽으로 잘못 안내받는 것보다 낫다고 판단될 때만 사용하세요. 남발하지 마세요.

---

## features 판단 기준
아래 목록에서 **사진에서 명확하게 눈에 띄는 특징만** 골라 정확히 이 텍스트 그대로 사용하세요.
확신도 80% 미만이면 포함하지 마세요. 0개~3개가 적절하며, 4개 이상이면 다시 검토하세요.

선택 가능 목록:
"눈 간격 넓음", "눈 간격 좁음", "코 낮음", "코 높음", "코 큼",
"이마 넓음", "이마 좁음", "눈 작음", "광대 넓음", "입술 얇음",
"입술 두꺼움", "중안부 긴 유형", "중안부 짧은 유형", "눈두덩이 좁음",
"눈두덩이 넓음", "관자놀이 여백 넓음", "사각턱", "돌출입", "목 짧음",
"무쌍", "속쌍꺼풀", "눈꼬리 처짐", "눈꼬리 올라감", "눈꼬리 막힘",
"눈두덩이 살 두꺼움", "눈두덩이 살 얇음", "둥근 눈", "아몬드 눈", "긴 눈",
"삼백안", "인중 긺", "인중 짧음", "무턱", "주걱턱", "콘헤드",
"어깨 너비 넓음", "승모근 발달\""""


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

    output = {"model": GEMINI_MODEL, "runs": args.runs, "modes": modes,
              "results": results, "summary": summary}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"\n저장: {args.output}")


if __name__ == "__main__":
    main()
