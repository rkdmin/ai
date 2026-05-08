"""
build-golden-set 스킬 헬퍼.

서브명령:
  canonicalize <url>             — Wikimedia URL 정규화 + 파일명 추출
  check <rejections.json> --url X | --filename Y | --sha Z
                                  — 거절 이력에 매치되는지 확인
  add <rejections.json> <name> <url> <filename> <sha> <reason>
                                  — 거절 이력에 추가
  sha256 <file>                  — 파일 SHA256

운영 위치는 tools/ — backend 와 무관, 로컬 스킬 전용.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.parse
from datetime import date
from pathlib import Path


def canonicalize(url: str) -> tuple[str, str]:
    """
    thumb URL → canonical URL + 디코딩된 파일명.
    예) /wikipedia/commons/thumb/3/33/Foo.jpg/250px-Foo.jpg
        → /wikipedia/commons/3/33/Foo.jpg
    """
    # 프로토콜 누락 보정 (//upload... 형식)
    if url.startswith("//"):
        url = "https:" + url

    canonical = re.sub(
        r"/wikipedia/commons/thumb/([^/]+/[^/]+)/([^/]+)/[^/]+$",
        r"/wikipedia/commons/\1/\2",
        url,
    )
    filename = canonical.rsplit("/", 1)[-1]
    filename = urllib.parse.unquote(filename)
    return canonical, filename


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def upload_url_from_filename(filename: str) -> str:
    """
    Wikimedia Commons 의 upload URL 을 파일명으로부터 결정적으로 계산.
    규칙: MD5(filename) 의 앞 1자/앞 2자가 디렉토리.
        e.g. "Foo.jpg" → md5=ac... → /a/ac/Foo.jpg
    """
    md5 = hashlib.md5(filename.encode("utf-8")).hexdigest()
    return f"https://upload.wikimedia.org/wikipedia/commons/{md5[0]}/{md5[:2]}/{urllib.parse.quote(filename)}"


# 사전 필터 키워드 — 골든셋 부적합 사진 패턴
EXCLUDE_KEYWORDS = [
    "press_conference", "press-conference", "presscon",
    "stage", "live", "performance", "performing", "concert",
    "speech", "speaking", "interview", "공연", "무대",
    "_at_the_", "_event", "showcase", "fan_meeting", "fanmeeting",
    "premiere", "red_carpet", "redcarpet", "awards",
    "with_microphone", "holding",
]
PREFER_KEYWORDS = [
    "portrait", "headshot", "studio", "profile", "프로필", "프로필사진",
]


def prefilter_filenames(filenames: list[str]) -> dict:
    """
    파일명 리스트를 골든셋 적합도로 분류.
    return: {"preferred": [...], "neutral": [...], "excluded": [...]}
    """
    out = {"preferred": [], "neutral": [], "excluded": []}
    for f in filenames:
        lower = f.lower()
        if any(k in lower for k in EXCLUDE_KEYWORDS):
            out["excluded"].append(f)
        elif any(k in lower for k in PREFER_KEYWORDS):
            out["preferred"].append(f)
        else:
            out["neutral"].append(f)
    return out


def load_rejections(rejections_path: Path) -> dict:
    if not rejections_path.exists():
        return {"rejections": []}
    return json.loads(rejections_path.read_text(encoding="utf-8"))


def find_rejection(data: dict, *, url=None, filename=None, sha=None) -> dict | None:
    for r in data.get("rejections", []):
        if url and r.get("imageUrl") == url:
            return r
        if filename and r.get("filename") == filename:
            return r
        if sha and r.get("sha256") == sha:
            return r
    return None


def add_rejection(rejections_path: Path, name, url, filename, sha, reason):
    data = load_rejections(rejections_path)
    data.setdefault("rejections", []).append({
        "name": name,
        "imageUrl": url,
        "filename": filename,
        "sha256": sha,
        "reason": reason,
        "rejectedAt": date.today().isoformat(),
    })
    rejections_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("canonicalize", help="URL 정규화 + 파일명 추출")
    p1.add_argument("url")

    p2 = sub.add_parser("check", help="거절 이력 매치 확인")
    p2.add_argument("rejections_path")
    p2.add_argument("--url")
    p2.add_argument("--filename")
    p2.add_argument("--sha")

    p3 = sub.add_parser("add", help="거절 이력 추가")
    p3.add_argument("rejections_path")
    p3.add_argument("name")
    p3.add_argument("url")
    p3.add_argument("filename")
    p3.add_argument("sha")
    p3.add_argument("reason")

    p4 = sub.add_parser("sha256", help="파일 SHA256")
    p4.add_argument("file")

    p5 = sub.add_parser("upload-url", help="Commons 파일명 → upload.wikimedia.org URL")
    p5.add_argument("filename")

    p6 = sub.add_parser("prefilter", help="파일명 리스트(stdin, 한 줄당 1개) → preferred/neutral/excluded JSON")

    args = parser.parse_args()

    # Windows 한글 출력 보정
    if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8")

    if args.cmd == "canonicalize":
        canonical, filename = canonicalize(args.url)
        print(json.dumps({"canonical": canonical, "filename": filename}, ensure_ascii=False))
    elif args.cmd == "check":
        data = load_rejections(Path(args.rejections_path))
        match = find_rejection(data, url=args.url, filename=args.filename, sha=args.sha)
        print(json.dumps({"rejected": bool(match), "match": match}, ensure_ascii=False))
    elif args.cmd == "add":
        add_rejection(
            Path(args.rejections_path),
            args.name, args.url, args.filename, args.sha, args.reason,
        )
        print("OK")
    elif args.cmd == "sha256":
        print(sha256_of(Path(args.file)))
    elif args.cmd == "upload-url":
        print(upload_url_from_filename(args.filename))
    elif args.cmd == "prefilter":
        names = [line.strip() for line in sys.stdin if line.strip()]
        print(json.dumps(prefilter_filenames(names), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
