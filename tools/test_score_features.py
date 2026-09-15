"""score_features.py 회귀 테스트 — 채점기가 틀리면 지표가 조용히 거짓말을 한다.

실행 (backend venv 에 pytest 가 있다):
  backend/.venv/Scripts/python.exe -m pytest tools/test_score_features.py -q
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import score_features as sf  # noqa: E402


# ── 화이트리스트 파싱 ─────────────────────────────────────────────


def test_화이트리스트는_ANALYZE_PROMPT_에서_파싱된다():
    assert len(sf.WHITELIST) == 37
    assert "사각턱" in sf.WHITELIST
    # 무드 키워드 목록이 섞이면 안 된다 (프롬프트에 "선택 가능 목록" 이 두 번 나온다)
    assert "ROMANTIC" not in sf.WHITELIST


def test_표기가_흔들려도_화이트리스트로_되돌린다():
    assert sf._canonical("사각턱 (하관 발달)") == "사각턱"
    assert sf._canonical("V라인 턱") is None


# ── 회차 채점 ─────────────────────────────────────────────────────


def test_얼굴형과_상충하는_feature_는_위반으로_잡힌다():
    r = sf.score_run({"faceType": "둥근형", "features": ["사각턱", "무쌍"]})
    assert r["violations"]["conflicting"] == ["사각턱"]
    assert r["count"] == 2  # 채점기는 제거하지 않는다 — 세는 게 일이다


def test_사각형에서_사각턱은_위반이_아니다():
    r = sf.score_run({"faceType": "사각형", "features": ["사각턱"]})
    assert r["violations"]["conflicting"] == []


def test_반대_속성_중복_초과_화이트리스트밖이_각각_분류된다():
    r = sf.score_run({"faceType": "계란형", "features": [
        "눈꼬리 처짐", "눈꼬리 올라감", "무쌍", "무쌍", "코 높음", "V라인 턱",
    ]})
    v = r["violations"]
    assert v["exclusive"] == ["눈꼬리 올라감"]
    assert v["duplicates"] == ["무쌍"]
    assert v["offWhitelist"] == ["V라인 턱"]
    assert v["overCount"] is True  # 중복 제외 4개 > 목표 3개


# ── 사진 단위 ─────────────────────────────────────────────────────


def _photo(*runs, **labels):
    return sf.score_photo({"file": "x.jpg", "runs": [
        {"faceType": "계란형", "features": list(f)} for f in runs
    ], **labels})


def test_회차_간_반대_속성이_갈리면_잡는다():
    p = _photo(["눈 간격 넓음"], ["눈 간격 좁음"])
    assert p["crossRunContradictions"] == [["눈 간격 넓음", "눈 간격 좁음"]]
    assert p["alwaysFeatures"] == []
    assert sorted(p["flakyFeatures"]) == ["눈 간격 넓음", "눈 간격 좁음"]


def test_한_회차_안의_충돌은_회차간_충돌로_세지_않는다():
    p = _photo(["눈 간격 넓음", "눈 간격 좁음"])
    assert p["crossRunContradictions"] == []  # violations.exclusive 가 이미 잡는다
    assert p["violationRuns"] == 1


def test_안정성은_라벨_집합_Jaccard_평균이다():
    p = _photo(["무쌍", "코 높음"], ["무쌍"])
    assert p["stability"] == 0.5
    assert _photo([], [])["stability"] == 1.0  # 둘 다 0개면 안정적으로 0개다
    assert _photo(["무쌍"])["stability"] is None  # 1회는 측정 불가


# ── 집계 / Phase B ────────────────────────────────────────────────


def test_수율과_커버리지가_집계된다():
    s = sf.score([
        {"file": "a.jpg", "runs": [{"faceType": "계란형", "features": ["무쌍"]}]},
        {"file": "b.jpg", "runs": [{"faceType": "계란형", "features": []}]},
    ])["summary"]
    assert s["yield"]["mean"] == 0.5
    assert s["yield"]["zeroRate"] == "1/2"
    assert s["coverage"]["used"] == 1
    assert len(s["coverage"]["neverUsed"]) == 36
    assert s["labeled"] is None  # 라벨이 없으면 정확도는 계산하지 않는다


def test_부분_라벨이_있으면_recall_과_금지라벨을_잰다():
    s = sf.score([{
        "file": "a.jpg",
        "runs": [{"faceType": "둥근형", "features": ["무쌍", "사각턱"]}],
        "expectedFeatures": ["무쌍", "무턱"],
        "forbiddenFeatures": ["사각턱"],
    }])["summary"]["labeled"]
    assert s["recall"] == "1/2"
    assert s["missed"] == [{"file": "a.jpg", "labels": ["무턱"]}]
    assert s["forbiddenHits"] == 1


# ── 입력 어댑터 ───────────────────────────────────────────────────


def test_eval_py_와_스킬_출력_형식을_모두_읽는다():
    doc = {"results": [
        {"file": "a.jpg", "modes": {"A": [{"faceType": "계란형", "features": ["무쌍"]},
                                          {"error": "HTTP 429"}]}},
        {"file": "b.jpg", "runs": [{"faceType": "긴형", "features": []}]},
        {"file": "c.jpg", "actual": {"faceType": "긴형", "features": ["코 높음"]}},
        {"file": "d.jpg", "error": "얼굴 검출 실패"},
    ]}
    entries = sf.load_entries(doc, mode="A")
    assert [e["file"] for e in entries] == ["a.jpg", "b.jpg", "c.jpg"]
    assert len(entries[0]["runs"]) == 1  # 에러 회차는 제외


def test_골든셋_라벨이_파일별로_합쳐진다():
    doc = {"results": [{"file": "a.jpg", "runs": [{"faceType": "계란형", "features": []}]}]}
    golden = {"items": [
        {"file": "a.jpg", "expectedFeatures": ["무쌍"]},
        {"file": "b.jpg", "expectedFeatures": ["코 높음"]},
    ]}
    entries = sf.load_entries(doc, golden=golden)
    assert entries[0]["expectedFeatures"] == ["무쌍"]
