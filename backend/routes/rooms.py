"""
Beauty Room · 초대 · 참여 · 랭킹 · 앱 인계 (plan 0009 P6 · F08·F09).

방장(로그인):
  POST /api/rooms                      — 내 활성 Room 반환 또는 생성 (사용자당 1개, 현재 분석 snapshot 고정)
  GET  /api/rooms/me                   — 내 Room + 랭킹 (소유자 DTO)
  POST /api/rooms/me/invites           — 초대 token 발급 (7일)
  POST /api/rooms/me/invites/revoke    — 모든 초대 회수 → 공개 조회 즉시 막힘
초대받은 친구(공개 — 로그인 없이):
  GET  /api/invites/{token}            — 방장 공개 요약 + 참여 수 + 상태 (valid/expired/revoked)
  POST /api/invites/{token}/join       — 참여 (닉네임 + 공개 요약 또는 로그인 사용자의 analysisId). 케미·현재 순위 반환 + 인계 token
앱 인계(로그인):
  POST /api/handoffs/{token}/claim     — 웹 참여를 내 계정에 붙이고 "내 Room" 진입 정보를 돌려준다 (1회성)

Room 생성 로그인 규칙은 미결(R02)이지만 방장은 어차피 서버가 기억해야 하므로 require_user 다.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from middleware import rate_limit
from middleware.auth import Principal, get_principal, require_user
from models import errors
from models.errors import ApiError
from models.schemas import (
    InviteJoinRequest,
    InviteJoinResponse,
    InvitePublicResponse,
    RoomCreateRequest,
    RoomResponse,
)
from services import chemistry_service, room_store, supabase_service

router = APIRouter()


def _owner_dto(room: dict, participants: list[dict]) -> dict:
    ranked = chemistry_service.rank([
        {"id": p["id"], "nickname": p["nickname"], "profile": p["profile_snapshot"], "chemistry": p["chemistry"], "joinedAt": p.get("joined_at")}
        for p in participants
    ])
    return {
        "id": room["id"],
        "active": room["active"],
        "ruleVersion": room["rule_version"],
        "owner": {"nickname": room["owner_nickname"], **room["owner_snapshot"]},
        "participantCount": len(ranked),
        "participants": ranked,
        "createdAt": room.get("created_at"),
    }


async def _snapshot_for_user(user_id: str, analysis_id: str | None, fallback: dict | None) -> dict:
    """로그인 사용자는 서버 분석에서, 아니면 요청에 실린 공개 요약에서. 둘 다 없으면 400."""
    if analysis_id and supabase_service.configured():
        row = await supabase_service._get_analysis(user_id, analysis_id, select="id,face_type,features,mood_archetype,result,schema_version")
        if not row:
            raise ApiError(errors.NOT_FOUND, "분석 기록을 찾을 수 없습니다.")
        return supabase_service.analysis_from_row(row)
    if fallback:
        return fallback
    raise ApiError(errors.NOT_FOUND, "분석 결과가 필요해요. 먼저 Beauty Mood 를 분석해 주세요.")


@router.post("/rooms", response_model=RoomResponse)
async def create_room(body: RoomCreateRequest, principal: Principal = Depends(require_user)):
    existing = await room_store.get_active_room(principal.user_id)
    if existing:
        return _owner_dto(existing, await room_store.list_participants(existing["id"]))
    snapshot = await _snapshot_for_user(principal.user_id, body.analysisId, body.profile)
    if not chemistry_service.public_profile(snapshot, "x")["primaryMood"]:
        raise ApiError(errors.NOT_FOUND, "무드 정보가 없는 분석으로는 Room 을 만들 수 없어요. 다시 분석해 주세요.")
    public = chemistry_service.public_profile(snapshot, body.nickname or "나")
    nickname = public.pop("nickname")
    room = await room_store.create_room(principal.user_id, nickname, public, body.analysisId, chemistry_service.RULE_VERSION)
    return _owner_dto(room, [])


@router.get("/rooms/me", response_model=RoomResponse)
async def my_room(principal: Principal = Depends(require_user)):
    room = await room_store.get_active_room(principal.user_id)
    if not room:
        raise ApiError(errors.NOT_FOUND, "아직 Beauty Room 이 없어요.")
    return _owner_dto(room, await room_store.list_participants(room["id"]))


@router.post("/rooms/me/invites")
async def create_invite(principal: Principal = Depends(require_user)):
    room = await room_store.get_active_room(principal.user_id)
    if not room:
        raise ApiError(errors.NOT_FOUND, "아직 Beauty Room 이 없어요.")
    inv = await room_store.create_invite(room["id"])
    return {"token": inv["token"], "path": f"/invite/{inv['token']}", "expiresAt": inv["expires_at"]}


@router.post("/rooms/me/invites/revoke")
async def revoke_invites(principal: Principal = Depends(require_user)):
    room = await room_store.get_active_room(principal.user_id)
    if not room:
        raise ApiError(errors.NOT_FOUND, "아직 Beauty Room 이 없어요.")
    return {"revoked": await room_store.revoke_invites(room["id"])}


async def _valid_invite(token: str) -> tuple[dict, dict]:
    inv = await room_store.get_invite(token)
    state = room_store.invite_state(inv)
    if state != "valid":
        raise ApiError(errors.INVITE_INVALID, {"expired": "초대 링크가 만료됐어요.", "revoked": "초대가 취소됐어요.", "missing": "유효하지 않은 초대 링크예요."}[state])
    room = await room_store.get_room(inv["room_id"])
    if not room or not room["active"]:
        raise ApiError(errors.INVITE_INVALID, "이 Beauty Room 은 더 이상 열려 있지 않아요.")
    return inv, room


@router.get("/invites/{token}", response_model=InvitePublicResponse)
async def invite_public(token: str):
    inv = await room_store.get_invite(token)
    state = room_store.invite_state(inv)
    if state != "valid":
        return InvitePublicResponse(state=state, owner=None, participantCount=0, ruleVersion=None)
    room = await room_store.get_room(inv["room_id"])
    if not room or not room["active"]:
        return InvitePublicResponse(state="revoked", owner=None, participantCount=0, ruleVersion=None)
    participants = await room_store.list_participants(room["id"])
    # 공개 DTO: 닉네임·대표 무드·Traits·제목만. 이메일·사진·전체 이력 없음
    return InvitePublicResponse(
        state="valid",
        owner={"nickname": room["owner_nickname"], **room["owner_snapshot"]},
        participantCount=len(participants),
        ruleVersion=room["rule_version"],
    )


@router.post("/invites/{token}/join", response_model=InviteJoinResponse)
async def invite_join(token: str, body: InviteJoinRequest, request: Request, principal: Principal = Depends(get_principal)):
    rate_limit.consume("rooms", principal, request)
    inv, room = await _valid_invite(token)

    if not principal.is_guest and principal.user_id == room["owner_id"]:
        raise ApiError(errors.INVITE_INVALID, "내 Room 에는 참여할 수 없어요.")
    if principal.is_guest and not body.clientKey:
        raise ApiError(errors.INVITE_INVALID, "clientKey 가 필요해요.")

    snapshot = await _snapshot_for_user(principal.user_id, body.analysisId, body.profile) if not principal.is_guest else body.profile
    if not snapshot:
        raise ApiError(errors.NOT_FOUND, "분석 결과가 필요해요. 먼저 Beauty Mood 를 분석해 주세요.")

    existing = await room_store.find_participant(room["id"], participant_id=None if principal.is_guest else principal.user_id, client_key=body.clientKey if principal.is_guest else None)
    if existing:
        participant = existing  # 같은 친구가 다시 참여해도 참여 수가 늘지 않는다 (snapshot 유지, R17)
    else:
        public = chemistry_service.public_profile(snapshot, body.nickname or "친구")
        public.pop("nickname")
        chem = chemistry_service.compute(room["owner_snapshot"], public)
        participant = await room_store.add_participant(
            room["id"],
            participant_id=None if principal.is_guest else principal.user_id,
            client_key=body.clientKey if principal.is_guest else None,
            nickname=body.nickname or "친구",
            snapshot=public,
            chemistry=chem,
        )

    participants = await room_store.list_participants(room["id"])
    ranked = chemistry_service.rank([{"id": p["id"], "chemistry": p["chemistry"], "joinedAt": p.get("joined_at")} for p in participants])
    my_rank = next((p["rank"] for p in ranked if p["id"] == participant["id"]), None)
    handoff = await room_store.create_handoff(participant["id"])
    return InviteJoinResponse(
        owner={"nickname": room["owner_nickname"], **room["owner_snapshot"]},
        me={"nickname": participant["nickname"], **participant["profile_snapshot"]},
        chemistry=participant["chemistry"],
        rank=my_rank,
        participantCount=len(participants),
        handoffToken=handoff["token"],
        handoffExpiresAt=handoff["expires_at"],
    )


@router.post("/handoffs/{token}/claim")
async def handoff_claim(token: str, principal: Principal = Depends(require_user)):
    """웹에서 참여한 기록을 로그인한 내 계정에 붙인다. 1회성. 성공하면 '내 Room 만들기' 로 이어갈 수 있는 요약을 돌려준다."""
    row = await room_store.consume_handoff(token)
    if not row:
        raise ApiError(errors.INVITE_INVALID, "인계 링크가 만료됐거나 이미 사용됐어요. 앱에서 로그인한 뒤 다시 시도해 주세요.")
    participant = await room_store.get_participant(row["participant_id"])
    if not participant:
        raise ApiError(errors.NOT_FOUND)
    await room_store.attach_participant_user(participant["id"], principal.user_id)
    return {
        "ok": True,
        "profile": participant["profile_snapshot"],
        "nickname": participant["nickname"],
        "joinedRoomId": participant["room_id"],
        "hasOwnRoom": bool(await room_store.get_active_room(principal.user_id)),
    }
