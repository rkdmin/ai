"""features 축 채점 — `/eval-face` 스킬과 `tools/eval.py` 가 공유하는 단일 소스.

얼굴형과 달리 features 에는 ground truth 가 없다 (골든셋 폴더명은 얼굴형 라벨뿐이다).
라벨 없이 "정확도 %" 를 만들면 가짜 숫자가 나오므로, **라벨 0개로 측정 가능한 지표**를
Phase A 로 두고 정확도는 부분 라벨이 붙은 뒤에만(Phase B) 계산한다.

Phase A — 라벨 없이 측정
  yield        장당 features 개수 (프롬프트 목표는 3개). 0개 비율.
  coverage     화이트리스트 37개 중 실제로 등장한 라벨 수. 한 번도 안 나온 라벨 목록.
  stability    같은 사진 N회 반복의 라벨 집합 Jaccard. 회차 간 반대 속성이 갈리면 별도 표시.
  vocabulary   화이트리스트 밖 라벨 / 표기 흔들림("사각턱 (하관 발달)") 발생률.
  consistency  CONFLICTING_FEATURES · EXCLUSIVE_FEATURE_PAIRS 위반 (사후 필터 적용 전 raw 기준).

Phase B — 골든셋에 부분 라벨을 붙이면 자동 활성
  골든셋 item 에 `expectedFeatures`(명백히 보여서 반드시 나와야) /
  `forbiddenFeatures`(나오면 오검출) 를 넣은 사진만 채점한다. 라벨 없는 나머지는 무채점이다.
  애매한 특징을 억지로 라벨링해 정밀도를 위조하지 않는다.

규칙과 표기 흔들림 흡수는 backend/services/rag_service.py 를 import 해서 쓴다.
사본을 두면 조용히 어긋난다 (ADR 0009 #5 — eval.py 가 실제로 그랬다).

사용법:
    python tools/score_features.py tools/eval-claude-results.json
    python tools/score_features.py tools/report.json --golden tools/golden-set.json --mode A
    python tools/score_features.py results.json --json          # 지표만 JSON 으로
"""

from __future__ import annotations

import argparse
import itertools
import json
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from services.rag_service import (  # noqa: E402
    ANALYZE_PROMPT,
    CONFLICTING_FEATURES,
    EXCLUSIVE_FEATURE_PAIRS,
    _exclusive_conflict,  # 표기 흔들림까지 흡수하는 판정 — 사본 금지
    _has,
)

# 프롬프트가 3개를 목표로 하고 4개 이상이면 재검토하라고 지시한다.
TARGET_FEATURE_COUNT = 3
MAX_FEATURE_COUNT = 3

# 정면 얼굴 크롭으로 관찰 가능한지 자체가 의심스러운 라벨. **채점하지 않는다** —
# coverage 리포트에서 "안 나온 게 모델 탓인지 목록 탓인지" 구분하는 힌트로만 쓴다.
SUSPECT_UNOBSERVABLE = ("어깨 너비 넓음", "승모근 발달", "목 짧음", "콘헤드")


def feature_whitelist() -> tuple[str, ...]:
    """ANALYZE_PROMPT 의 features 화이트리스트를 파싱한다.

    무드 쪽에도 "선택 가능 목록 (영문 키워드):" 이 있으므로 features 섹션 이후만 본다.
    """
    tail = ANALYZE_PROMPT.split("## features 판단 기준", 1)
    if len(tail) != 2:
        raise RuntimeError("ANALYZE_PROMPT 에서 '## features 판단 기준' 섹션을 찾지 못했다")
    block = tail[1].split("선택 가능 목록:", 1)
    if len(block) != 2:
        raise RuntimeError("features 섹션에서 '선택 가능 목록:' 을 찾지 못했다")
    labels = re.findall(r'"([^"\n]+)"', block[1])
    if len(labels) < 20:
        raise RuntimeError(f"화이트리스트 파싱이 의심스럽다 — {len(labels)}개만 잡혔다")
    return tuple(labels)


WHITELIST = feature_whitelist()


def _canonical(feature: str) -> str | None:
    """표기가 흔들린 라벨을 화이트리스트 항목으로 되돌린다. 매칭 실패면 None."""
    f = (feature or "").strip()
    if not f:
        return None
    if f in WHITELIST:
        return f
    for w in WHITELIST:
        if _has(f, w):  # "사각턱 (하관 발달)" → "사각턱"
            return w
    return None


# ── 한 회차 채점 ──────────────────────────────────────────────────


def score_run(run: dict) -> dict:
    """한 번의 분석 응답을 채점한다. run = {"faceType": ..., "features": [...]}"""
    face_type = run.get("faceType") or ""
    raw = [f for f in (run.get("features") or []) if isinstance(f, str) and f.strip()]
    conflicting = CONFLICTING_FEATURES.get(face_type, ())

    canonical: list[str] = []
    off_whitelist: list[str] = []
    variants: list[str] = []
    duplicates: list[str] = []
    conflicts: list[str] = []
    exclusives: list[str] = []

    for f in raw:
        f = f.strip()
        c = _canonical(f)
        if c is None:
            off_whitelist.append(f)
            continue
        if c != f:
            variants.append(f)
        if c in canonical:
            duplicates.append(f)
            continue
        if any(_has(f, x) for x in conflicting):
            conflicts.append(f)
        if _exclusive_conflict(f, canonical):
            exclusives.append(f)
        canonical.append(c)

    return {
        "faceType": face_type,
        "raw": raw,
        "features": canonical,
        "count": len(canonical),
        "violations": {
            "conflicting": conflicts,
            "exclusive": exclusives,
            "offWhitelist": off_whitelist,
            "duplicates": duplicates,
            "overCount": len(canonical) > MAX_FEATURE_COUNT,
        },
    }


def _violation_count(scored_run: dict) -> int:
    v = scored_run["violations"]
    return (
        len(v["conflicting"]) + len(v["exclusive"]) + len(v["offWhitelist"])
        + len(v["duplicates"]) + (1 if v["overCount"] else 0)
    )


# ── 사진 단위 채점 ────────────────────────────────────────────────


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0  # 둘 다 0개면 "안정적으로 아무것도 안 나온다" 는 뜻이다
    return len(a & b) / len(a | b)


def _cross_run_contradictions(sets: list[set[str]]) -> list[list[str]]:
    """회차 간 반대 속성 충돌. 라벨 정의가 깨졌다는 가장 강한 신호다.

    한 회차 안의 충돌은 여기가 아니라 violations.exclusive 가 잡는다. 그래서 **서로 다른
    회차**에 갈려 나온 경우만 센다 (1회만 돌렸으면 항상 빈 목록).
    """
    idx = range(len(sets))
    out = []
    for a, b in EXCLUSIVE_FEATURE_PAIRS:
        if any(a in sets[i] and b in sets[j] for i in idx for j in idx if i != j):
            out.append([a, b])
    return out


def score_photo(entry: dict) -> dict:
    """entry = {"file", "runs": [{"faceType","features"}], (선택) "expectedFeatures"/"forbiddenFeatures"}"""
    runs = [score_run(r) for r in (entry.get("runs") or [])]
    sets = [set(r["features"]) for r in runs]

    pairs = list(itertools.combinations(sets, 2))
    stability = round(sum(_jaccard(a, b) for a, b in pairs) / len(pairs), 3) if pairs else None
    always = set.intersection(*sets) if sets else set()
    ever = set().union(*sets) if sets else set()

    out = {
        "file": entry.get("file"),
        "runs": runs,
        "counts": [r["count"] for r in runs],
        "zeroRuns": sum(1 for r in runs if r["count"] == 0),
        "violationRuns": sum(1 for r in runs if _violation_count(r) > 0),
        "stability": stability,
        "alwaysFeatures": sorted(always),
        "flakyFeatures": sorted(ever - always),
        "crossRunContradictions": _cross_run_contradictions(sets),
    }

    expected = list(entry.get("expectedFeatures") or [])
    forbidden = list(entry.get("forbiddenFeatures") or [])
    if expected or forbidden:
        out["labeled"] = {
            "expected": expected,
            "missed": sorted(x for x in expected if x not in ever),
            "hitInAllRuns": sorted(x for x in expected if x in always),
            "forbidden": forbidden,
            "forbiddenHits": sorted(x for x in forbidden if x in ever),
        }
    return out


# ── 집계 ──────────────────────────────────────────────────────────


def aggregate(photos: list[dict]) -> dict:
    total_runs = sum(len(p["runs"]) for p in photos)
    counts = [c for p in photos for c in p["counts"]]
    used: dict[str, int] = {}
    off: list[str] = []
    variants_seen: list[str] = []
    kinds = {"conflicting": 0, "exclusive": 0, "offWhitelist": 0, "duplicates": 0, "overCount": 0}

    for p in photos:
        for r in p["runs"]:
            for f in r["features"]:
                used[f] = used.get(f, 0) + 1
            v = r["violations"]
            off.extend(v["offWhitelist"])
            for k in ("conflicting", "exclusive", "offWhitelist", "duplicates"):
                kinds[k] += len(v[k])
            if v["overCount"]:
                kinds["overCount"] += 1
            variants_seen.extend(f for f in r["raw"] if f not in WHITELIST and _canonical(f))

    stabilities = [p["stability"] for p in photos if p["stability"] is not None]
    labeled = [p for p in photos if "labeled" in p]

    summary = {
        "photos": len(photos),
        "runsPerPhoto": sorted({len(p["runs"]) for p in photos}),
        "totalRuns": total_runs,
        "yield": {
            "target": TARGET_FEATURE_COUNT,
            "mean": round(sum(counts) / len(counts), 2) if counts else 0,
            "distribution": {str(n): counts.count(n) for n in sorted(set(counts))},
            "zeroRate": f"{sum(1 for c in counts if c == 0)}/{len(counts)}" if counts else "0/0",
        },
        "coverage": {
            "used": len(used),
            "total": len(WHITELIST),
            "topLabels": dict(sorted(used.items(), key=lambda kv: -kv[1])[:10]),
            "neverUsed": [w for w in WHITELIST if w not in used],
            "neverUsedSuspectUnobservable": [w for w in SUSPECT_UNOBSERVABLE if w not in used],
        },
        "stability": {
            "mean": round(sum(stabilities) / len(stabilities), 3) if stabilities else None,
            "worst": sorted(
                ({"file": p["file"], "jaccard": p["stability"], "flaky": p["flakyFeatures"]}
                 for p in photos if p["stability"] is not None),
                key=lambda x: x["jaccard"],
            )[:3],
            "contradictionFiles": [
                {"file": p["file"], "pairs": p["crossRunContradictions"]}
                for p in photos if p["crossRunContradictions"]
            ],
        },
        "vocabulary": {
            "offWhitelist": sorted(set(off)),
            "offWhitelistRate": f"{len(off)}/{total_runs}",
            "variantExamples": sorted(set(variants_seen))[:10],
        },
        "consistency": {
            "violationRuns": sum(p["violationRuns"] for p in photos),
            "byKind": kinds,
        },
    }

    if labeled:
        expected_total = sum(len(p["labeled"]["expected"]) for p in labeled)
        missed = sum(len(p["labeled"]["missed"]) for p in labeled)
        forbidden_hits = sum(len(p["labeled"]["forbiddenHits"]) for p in labeled)
        summary["labeled"] = {
            "photos": len(labeled),
            "expectedTotal": expected_total,
            "recall": f"{expected_total - missed}/{expected_total}" if expected_total else "0/0",
            "missed": [
                {"file": p["file"], "labels": p["labeled"]["missed"]}
                for p in labeled if p["labeled"]["missed"]
            ],
            "forbiddenHits": forbidden_hits,
            "forbiddenHitFiles": [
                {"file": p["file"], "labels": p["labeled"]["forbiddenHits"]}
                for p in labeled if p["labeled"]["forbiddenHits"]
            ],
        }
    else:
        summary["labeled"] = None  # Phase B 미적용 — 골든셋에 부분 라벨이 없다
    return summary


def score(entries: list[dict]) -> dict:
    photos = [score_photo(e) for e in entries]
    return {"photos": photos, "summary": aggregate(photos)}


# ── 리포트 ────────────────────────────────────────────────────────


def render_report(scored: dict) -> str:
    s = scored["summary"]
    lines = ["=== features 축 (Phase A) ==="]
    for p in scored["photos"]:
        stab = "—" if p["stability"] is None else f"{p['stability']:.2f}"
        flag = ""
        if p["crossRunContradictions"]:
            flag = "  ⚠반대속성 " + ", ".join("↔".join(c) for c in p["crossRunContradictions"])
        elif p["violationRuns"]:
            flag = f"  ⚠위반 {p['violationRuns']}회"
        labels = ", ".join(p["alwaysFeatures"]) or "(없음)"
        if p["flakyFeatures"]:
            labels += " / 흔들림: " + ", ".join(p["flakyFeatures"])
        lines.append(f"{p['file']:<24} n={p['counts']} 안정성={stab}  [{labels}]{flag}")

    y, c, st, v, cs = s["yield"], s["coverage"], s["stability"], s["vocabulary"], s["consistency"]
    lines += [
        "",
        f"수율     장당 {y['mean']}개 (목표 {y['target']}) · 0개 {y['zeroRate']} · 분포 {y['distribution']}",
        f"커버리지 {c['used']}/{c['total']} 라벨 등장 · 미등장 {len(c['neverUsed'])}개",
        f"안정성   평균 Jaccard {st['mean']} · 반대속성 충돌 {len(st['contradictionFiles'])}장",
        f"어휘     화이트리스트 밖 {v['offWhitelistRate']} · 표기 흔들림 {len(v['variantExamples'])}종",
        f"정합성   위반 회차 {cs['violationRuns']}/{s['totalRuns']} · {cs['byKind']}",
    ]
    if c["neverUsedSuspectUnobservable"]:
        lines.append(
            "         (정면 크롭 관찰 난이도 의심 라벨 중 미등장: "
            + ", ".join(c["neverUsedSuspectUnobservable"]) + ")"
        )
    if s["labeled"]:
        lb = s["labeled"]
        lines.append(
            f"정확도   (Phase B, 라벨 {lb['photos']}장) recall {lb['recall']} · "
            f"금지 라벨 검출 {lb['forbiddenHits']}건"
        )
    else:
        lines.append("정확도   미측정 — 골든셋에 expectedFeatures/forbiddenFeatures 라벨이 없다 (Phase B)")
    return "\n".join(lines)


# ── 입력 어댑터 ───────────────────────────────────────────────────


def load_entries(doc: dict, mode: str | None = None, golden: dict | None = None) -> list[dict]:
    """eval.py 출력과 /eval-face 스킬 출력을 같은 형태로 흡수한다.

    - eval.py:      results[].modes[mode][] = {faceType, features}
    - 스킬(N회):    results[].runs[]        = {faceType, features}
    - 스킬(1회):    results[].actual        = {faceType, features}
    """
    labels = {}
    for item in (golden or {}).get("items", []):
        if item.get("expectedFeatures") or item.get("forbiddenFeatures"):
            labels[item["file"]] = item

    entries: list[dict] = []
    for row in doc.get("results", []):
        if row.get("error"):
            continue
        if "runs" in row:
            runs = row["runs"]
        elif "modes" in row:
            m = mode or sorted(row["modes"])[0]
            runs = [r for r in row["modes"].get(m, []) if not r.get("error")]
        elif "actual" in row:
            runs = [row["actual"]]
        else:
            continue
        label = labels.get(row.get("file"), {})
        entries.append({
            "file": row.get("file"),
            "runs": [r for r in runs if isinstance(r, dict)],
            "expectedFeatures": label.get("expectedFeatures"),
            "forbiddenFeatures": label.get("forbiddenFeatures"),
        })
    return entries


def main() -> None:
    ap = argparse.ArgumentParser(description="features 축 채점 (Phase A + 라벨 있으면 Phase B)")
    ap.add_argument("results", type=Path, help="eval.py 또는 /eval-face 결과 JSON")
    ap.add_argument("--golden", type=Path, default=Path(__file__).parent / "golden-set.json",
                    help="부분 라벨을 읽을 골든셋 (없으면 Phase A 만)")
    ap.add_argument("--mode", help="eval.py 결과에서 채점할 모드 (A/B)")
    ap.add_argument("--json", action="store_true", help="리포트 대신 지표 JSON 출력")
    args = ap.parse_args()

    doc = json.loads(args.results.read_text(encoding="utf-8"))
    golden = json.loads(args.golden.read_text(encoding="utf-8")) if args.golden.exists() else None
    entries = load_entries(doc, mode=args.mode, golden=golden)
    if not entries:
        sys.exit(f"채점할 결과가 없다: {args.results}")

    scored = score(entries)
    if args.json:
        print(json.dumps(scored["summary"], indent=2, ensure_ascii=False))
    else:
        print(render_report(scored))


if __name__ == "__main__":
    main()
