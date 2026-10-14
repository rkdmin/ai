"""
STYLE 피드·상세·제품 추천·북마크 (plan 0009 P5 · F07·F10).

GET  /api/styles?section=editorial|foryou&kind=makeup|hair|all&mood=&moods=&traits=&faceType=&limit=
GET  /api/styles/{id}?mood=&traits=
GET  /api/products/recommendations?mood=&moods=&traits=&personalColor=&part=&contentId=&limit=
GET  /api/bookmarks?kind=        (로그인)
PUT  /api/bookmarks/{contentId}  (로그인)   DELETE /api/bookmarks/{contentId}
POST /api/bookmarks/merge        (로그인) { contentIds: [] } — 게스트 기기 저장본을 계정에 합친다 (중복 없음)

STYLE 은 결제로 잠그지 않는다 (Figma IA). 개인화 입력(mood·traits)은 쿼리로 받는다 — 게스트도 기기 저장본으로 쓸 수 있게.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from middleware.auth import Principal, require_user
from models import errors
from models.errors import ApiError
from models.schemas import BookmarkMergeRequest
from services import bookmark_store, style_service

router = APIRouter()


def _csv(value: str | None) -> list[str]:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


@router.get("/styles")
async def styles_feed(
    section: str = Query(default="editorial", pattern="^(editorial|foryou|trending)$"),
    kind: str = Query(default="all", pattern="^(makeup|hair|mood|all)$"),
    mood: str | None = None, moods: str | None = None, traits: str | None = None, faceType: str | None = None,
    limit: int = Query(default=12, ge=1, le=50),
):
    return style_service.feed(section=section, kind=kind, mood=mood, moods=_csv(moods), traits=_csv(traits), face_type=faceType, limit=limit)


@router.get("/styles/{content_id}")
async def style_detail(content_id: str, mood: str | None = None, traits: str | None = None):
    item = style_service.detail(content_id, mood=mood, traits=_csv(traits))
    if not item:
        raise ApiError(errors.NOT_FOUND, "콘텐츠를 찾을 수 없어요.")
    return item


@router.get("/products/recommendations")
async def product_recommendations(
    mood: str | None = None, moods: str | None = None, traits: str | None = None, personalColor: str | None = None,
    part: str | None = Query(default=None, pattern="^(base|blush|lip|eye|brow|hair)$"), contentId: str | None = None,
    limit: int = Query(default=12, ge=1, le=50),
):
    return style_service.recommend_products(mood=mood, moods=_csv(moods), traits=_csv(traits), personal_color=personalColor, part=part, content_id=contentId, limit=limit)


# ── 북마크 ────────────────────────────────────────────────────────


def _card_for(content_id: str) -> dict:
    item = style_service.get_content(content_id)
    if not item:  # 삭제·비공개 글은 저장본으로 우회 열람할 수 없다
        raise ApiError(errors.NOT_FOUND, "저장할 수 없는 콘텐츠예요.")
    return item


@router.get("/bookmarks")
async def list_bookmarks(kind: str = Query(default="all", pattern="^(makeup|hair|mood|all)$"), principal: Principal = Depends(require_user)):
    rows = await bookmark_store.list_for(principal.user_id, kind)
    items = []
    for r in rows:
        item = style_service.get_content(r["content_id"])
        items.append({"contentId": r["content_id"], "kind": r["content_kind"], "savedAt": r.get("created_at"), "content": style_service._card(item) if item else None, "available": item is not None})
    return {"count": len(items), "items": items}


@router.put("/bookmarks/{content_id}")
async def add_bookmark(content_id: str, principal: Principal = Depends(require_user)):
    item = _card_for(content_id)
    await bookmark_store.upsert(principal.user_id, content_id, item.get("kind") or "mood")
    return {"saved": True, "contentId": content_id}


@router.delete("/bookmarks/{content_id}")
async def remove_bookmark(content_id: str, principal: Principal = Depends(require_user)):
    removed = await bookmark_store.delete(principal.user_id, content_id)
    return {"saved": False, "contentId": content_id, "removed": removed}


@router.post("/bookmarks/merge")
async def merge_bookmarks(body: BookmarkMergeRequest, principal: Principal = Depends(require_user)):
    merged, skipped = 0, []
    for cid in dict.fromkeys(body.contentIds):  # 순서 유지 + 중복 제거
        item = style_service.get_content(cid)
        if not item:
            skipped.append(cid)
            continue
        await bookmark_store.upsert(principal.user_id, cid, item.get("kind") or "mood")
        merged += 1
    rows = await bookmark_store.list_for(principal.user_id)
    return {"merged": merged, "skipped": skipped, "count": len(rows)}
