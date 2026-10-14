"""
STYLE 콘텐츠·제품 조회와 개인화 (plan 0009 P5 · D05·D06·F07).

- 사전은 backend/data/styles/content.json · products.json (운영 콘텐츠). 매번 AI 를 부르지 않는다.
- 기본은 published 만. STYLE_INCLUDE_DRAFTS=true (로컬 개발) 일 때만 draft 를 섞는다 — 초안·TBD 가 제품 화면에 나가지 않게.
- 개인화는 태그 점수다 (대표 무드 +3, 보조 무드 +1, trait +1, 얼굴형 +1). 매칭이 없으면 에디토리얼로 폴백하고
  personalized=false 를 돌려준다 — 개인화됐다고 과장하지 않는다.
- "지금 많이 보는" 집계는 없다. trending 섹션은 editorial 중 최신순이고 라벨도 '에디터 추천' 으로 쓴다 (R-D05).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_DIR = Path(__file__).resolve().parent.parent / "data" / "styles"
_CONTENT = json.loads((_DIR / "content.json").read_text(encoding="utf-8"))
_PRODUCTS = json.loads((_DIR / "products.json").read_text(encoding="utf-8"))

CONTENT_SCHEMA_VERSION = int(_CONTENT.get("schemaVersion") or 1)
KINDS = ("makeup", "hair", "mood")


def _include_drafts() -> bool:
    return os.getenv("STYLE_INCLUDE_DRAFTS", "").strip().lower() == "true"


def all_content(include_drafts: bool | None = None) -> list[dict[str, Any]]:
    drafts = _include_drafts() if include_drafts is None else include_drafts
    return [c for c in _CONTENT["items"] if c.get("status") == "published" or drafts]


def all_products(include_drafts: bool | None = None) -> list[dict[str, Any]]:
    drafts = _include_drafts() if include_drafts is None else include_drafts
    return [p for p in _PRODUCTS["items"] if (p.get("status") == "published" and p.get("active")) or drafts]


def get_content(content_id: str) -> dict[str, Any] | None:
    return next((c for c in all_content() if c["id"] == content_id), None)


# ── 개인화 점수 ────────────────────────────────────────────────────


def _profile(mood: str | None, moods: list[str] | None, traits: list[str] | None, face_type: str | None) -> dict[str, Any]:
    primary = (mood or "").upper() or None
    return {
        "primary": primary,
        "moods": {m.upper() for m in (moods or []) if m and m.upper() != primary},
        "traits": set(traits or []),
        "faceType": face_type,
    }


def _score(item: dict[str, Any], prof: dict[str, Any]) -> tuple[int, list[str]]:
    score, reasons = 0, []
    tags = set(item.get("moodTags") or [])
    if prof["primary"] and prof["primary"] in tags:
        score += 3
        reasons.append(f"{prof['primary']} 무드")
    shared = prof["moods"] & tags
    score += len(shared)
    reasons.extend(sorted(shared))
    t = prof["traits"] & set(item.get("traitTags") or [])
    score += len(t)
    reasons.extend(sorted(t))
    if prof["faceType"] and prof["faceType"] in (item.get("faceTypeTags") or []):
        score += 1
        reasons.append(prof["faceType"])
    return score, reasons


def _card(item: dict[str, Any], reasons: list[str] | None = None) -> dict[str, Any]:
    return {
        "id": item["id"], "kind": item.get("kind"), "category": item.get("category"), "title": item.get("title"),
        "summary": item.get("summary"), "heroAsset": item.get("heroAsset"), "status": item.get("status"),
        "editorial": bool(item.get("editorial")), "moodTags": item.get("moodTags") or [], "traitTags": item.get("traitTags") or [],
        "matchReasons": reasons or [],
    }


def feed(*, section: str, kind: str | None, mood: str | None, moods: list[str] | None, traits: list[str] | None, face_type: str | None, limit: int) -> dict[str, Any]:
    items = [c for c in all_content() if not kind or kind == "all" or c.get("kind") == kind]
    if section == "foryou" and (mood or moods or traits):
        prof = _profile(mood, moods, traits, face_type)
        scored = [(s, r, c) for c in items for s, r in [_score(c, prof)] if s > 0]
        scored.sort(key=lambda x: (-x[0], str(x[2].get("publishedAt") or ""), x[2]["id"]))
        if scored:
            return {"section": "foryou", "personalized": True, "label": "나를 위한 추천", "items": [_card(c, r) for _, r, c in scored[:limit]]}
    editorial = sorted([c for c in items if c.get("editorial")] or items, key=lambda c: (str(c.get("publishedAt") or ""), c["id"]), reverse=True)
    return {"section": section, "personalized": False, "label": "에디터 추천", "items": [_card(c) for c in editorial[:limit]]}


def detail(content_id: str, *, mood: str | None, traits: list[str] | None) -> dict[str, Any] | None:
    item = get_content(content_id)
    if not item:
        return None
    primary = (mood or "").upper()
    usage = (item.get("usageByMood") or {}).get(primary) if primary else None
    related = [_card(c) for cid in item.get("relatedContentIds") or [] for c in [get_content(cid)] if c]
    products = [product_card(p) for pid in item.get("relatedProductIds") or [] for p in [next((x for x in all_products() if x["id"] == pid), None)] if p]
    return {
        **_card(item),
        "body": item.get("body") or [],
        "publishedAt": item.get("publishedAt"),
        "usage": usage,                                   # 분석 후: 내 무드로 활용하는 법. 분석 전·없음: null → UI 가 안내 문구
        "personalized": item.get("personalized") if primary else None,  # CONTRAST / TEXTURE / POINT
        "relatedContents": related,
        "relatedProducts": products,
    }


# ── 제품 ──────────────────────────────────────────────────────────


def product_card(p: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": p["id"], "brand": p.get("brand"), "name": p.get("name"), "partType": p.get("partType"), "formType": p.get("formType"),
        "imageAsset": p.get("imageAsset"), "url": p.get("url"), "affiliate": bool(p.get("url")), "status": p.get("status"),
        "moodTags": p.get("moodTags") or [], "traitTags": p.get("traitTags") or [],
    }


def recommend_products(*, mood: str | None, moods: list[str] | None, traits: list[str] | None, personal_color: str | None, part: str | None, content_id: str | None, limit: int) -> dict[str, Any]:
    items = all_products()
    if part:
        items = [p for p in items if p.get("partType") == part]
    if content_id:
        c = get_content(content_id)
        wanted = set((c or {}).get("relatedProductIds") or [])
        linked = [p for p in items if p["id"] in wanted]
        if linked:
            return {"personalized": False, "source": "editorial_detail", "items": [product_card(p) for p in linked[:limit]]}
    prof = _profile(mood, moods, traits, None)
    scored = []
    for p in items:
        s, r = _score(p, prof)
        if personal_color and personal_color in (p.get("personalColorTags") or []):
            s += 1
            r.append(personal_color)
        if s > 0:
            scored.append((s, r, p))
    scored.sort(key=lambda x: (-x[0], x[2]["id"]))
    if scored:
        return {"personalized": True, "source": "analysis_result", "items": [{**product_card(p), "matchReasons": r} for _, r, p in scored[:limit]]}
    return {"personalized": False, "source": "editorial", "items": [product_card(p) for p in items[:limit]]}
