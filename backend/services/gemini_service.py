"""
Gemini 2.5 Flash 호출 — 분석 / 카드 생성 / 스타일 적용 사진 생성.
src/api/gemini.js 의 Python 포팅판.
"""
from __future__ import annotations

import base64
import json
import os
import re

import httpx

from services.rag_service import (
    ANALYZE_PROMPT,
    HAIR_CARDS_FORMAT,
    MAKEUP_CARDS_FORMAT,
    TOTAL_CARDS_FORMAT,
    build_hair_context,
    build_makeup_context,
    build_total_context,
)

VISION_MODEL = "gemini-2.5-flash"
IMAGE_MODEL = "gemini-2.5-flash-preview-image-generation"

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# 이미지 + 분석/이미지 생성 호출은 60초 안에 끝나는 경우가 대부분.
# Render free 인스턴스 슬립 해제까지 더해 90초 마진을 둔다.
_TIMEOUT = httpx.Timeout(90.0)


class GeminiError(Exception):
    pass


def _api_key() -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise GeminiError("GEMINI_API_KEY 가 설정되지 않았습니다.")
    return key


def _split_data_url(data_url: str) -> tuple[str, str]:
    """`data:image/jpeg;base64,...` → (mime, base64)"""
    if not data_url.startswith("data:"):
        # 순수 base64 이면 image/jpeg 로 가정
        return "image/jpeg", data_url
    head, b64 = data_url.split(",", 1)
    mime = head.split(";")[0].split(":")[1]
    return mime, b64


async def _call_gemini(model: str, parts: list[dict], response_mime: str = "text/plain") -> dict:
    url = f"{GEMINI_BASE}/{model}:generateContent?key={_api_key()}"
    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": response_mime},
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(url, json=body, headers={"content-type": "application/json"})
    if resp.status_code != 200:
        try:
            err = resp.json().get("error", {}).get("message")
        except Exception:
            err = None
        raise GeminiError(err or f"Gemini API 오류 ({resp.status_code})")
    return resp.json()


def _extract_text(data: dict) -> str:
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise GeminiError("Gemini 응답을 읽을 수 없습니다.") from e


def _extract_json_obj(text: str) -> dict:
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise GeminiError("분석 결과를 읽을 수 없습니다.")
    return json.loads(m.group(0))


def _extract_json_array(text: str) -> list:
    m = re.search(r"\[[\s\S]*\]", text)
    if not m:
        raise GeminiError("카드 데이터를 읽을 수 없습니다.")
    return json.loads(m.group(0))


def _build_analyze_prompt(face_ratios: dict | None) -> str:
    if not face_ratios:
        return ANALYZE_PROMPT
    ratios_block = (
        "[참고 지표 — MediaPipe 측정]\n"
        "아래 수치는 정면 사진에서 추출한 얼굴 랜드마크 비율입니다. **참고용**일 뿐 절대 기준이 아닙니다.\n"
        "이미지 관찰을 우선으로 하고, 수치는 모호한 경계를 판단할 때만 보조로 활용하세요.\n\n"
        + json.dumps(face_ratios, indent=2, ensure_ascii=False)
    )
    return f"{ratios_block}\n\n{ANALYZE_PROMPT}"


def _build_cards_prompt(
    analysis: dict,
    rag_context: str,
    output_format: str,
    domain: str,
    color_rule: str,
) -> str:
    pc = analysis.get("personalColor")
    color_line = (
        f"- 퍼스널컬러: {pc}" if pc else "- 퍼스널컬러: 미정 (사용자가 퍼스널컬러를 모름)"
    )
    features = ", ".join(analysis.get("features") or [])

    return (
        f"당신은 전문 뷰티 코치입니다. 아래 얼굴 분석 결과와 RAG 지식베이스를 참고해 {domain} 코디 카드 4장을 JSON 배열로 생성하세요. 다른 텍스트 없이 JSON만 응답하세요.\n"
        "추천 카드 3장은 적합도 높은 순으로 rank 1(가장 잘 어울림), rank 2, rank 3을 부여하세요.\n\n"
        "## 얼굴 분석\n"
        f"- 얼굴형: {analysis.get('faceType')}\n"
        f"{color_line}\n"
        f"- 이목구비 특징: {features}\n\n"
        "## RAG 지식베이스\n"
        f"{rag_context}\n\n"
        "## 출력 형식\n"
        f"{output_format}\n\n"
        f"규칙: {color_rule}\n"
        "moodLabel 규칙(반드시 준수, 위반 시 응답 거부): 무드 아키타입 8개(ROMANTIC / CLEAN / SOFT / ELEGANT / SHARP / CLASSIC / FRESH / EDGY) 중 하나를 골라 '키워드 · 한국어 분위기' 형태로 작성하세요. "
        "연예인·인물 이름·고유명사·'○○ st'·'look-alike' 등 인물 비교 표현은 모든 필드(mood, moodLabel, coachComment, hair, hairReason, featureTip 포함)에서 절대 사용하지 마세요. "
        "퍼블리시티권 침해 회피를 위한 강제 정책입니다."
    )


# ── 얼굴 분석 ────────────────────────────────────────────────────


async def analyze_face(image_b64: str, face_ratios: dict | None = None) -> dict:
    mime, data = _split_data_url(image_b64)
    prompt = _build_analyze_prompt(face_ratios)
    parts = [
        {"inlineData": {"mimeType": mime, "data": data}},
        {"text": prompt},
    ]
    raw = await _call_gemini(VISION_MODEL, parts, response_mime="application/json")
    text = _extract_text(raw)
    result = _extract_json_obj(text)
    if "error" in result:
        raise GeminiError(result["error"])
    if face_ratios:
        result["faceRatios"] = face_ratios
    return result


# ── 카드 생성 ────────────────────────────────────────────────────


_COLOR_RULE_DEFAULT = "추천 3장은 서로 다른 분위기(예: 데일리/글램/오피스)로 구성하세요."
_COLOR_RULE_NO_PC = (
    "퍼스널컬러 정보가 없으므로 메이크업은 특정 색상 대신 질감·효과 위주로 표현하세요. "
    "추천 3장은 서로 다른 분위기로 구성하세요."
)


async def generate_hair_cards(analysis: dict) -> list:
    rag_context = build_hair_context(analysis)
    prompt = _build_cards_prompt(
        analysis,
        rag_context,
        HAIR_CARDS_FORMAT,
        "헤어",
        "추천 3장은 서로 다른 분위기(예: 청순/시크/캐주얼)로 구성하세요.",
    )
    raw = await _call_gemini(VISION_MODEL, [{"text": prompt}], response_mime="application/json")
    return _extract_json_array(_extract_text(raw))


async def generate_makeup_cards(analysis: dict) -> list:
    rag_context = build_makeup_context(analysis)
    color_rule = _COLOR_RULE_DEFAULT if analysis.get("personalColor") else _COLOR_RULE_NO_PC
    prompt = _build_cards_prompt(analysis, rag_context, MAKEUP_CARDS_FORMAT, "메이크업", color_rule)
    raw = await _call_gemini(VISION_MODEL, [{"text": prompt}], response_mime="application/json")
    return _extract_json_array(_extract_text(raw))


async def generate_total_cards(analysis: dict) -> list:
    rag_context = build_total_context(analysis)
    color_rule = _COLOR_RULE_DEFAULT if analysis.get("personalColor") else _COLOR_RULE_NO_PC
    prompt = _build_cards_prompt(
        analysis, rag_context, TOTAL_CARDS_FORMAT, "헤어+메이크업 종합", color_rule
    )
    raw = await _call_gemini(VISION_MODEL, [{"text": prompt}], response_mime="application/json")
    return _extract_json_array(_extract_text(raw))


# ── 스타일 적용 사진 생성 ────────────────────────────────────────


async def generate_styled_photo(image_b64: str, card: dict) -> str:
    mime, data = _split_data_url(image_b64)

    hair_line = f"헤어스타일: {card['hair']}" if card.get("hair") else ""
    makeup = card.get("makeup") or {}
    makeup_lines = ""
    if card.get("makeup"):
        makeup_lines = (
            f"립 컬러: {makeup.get('lip', '')}\n"
            f"블러셔: {makeup.get('blush', '')}\n"
            f"아이섀도우: {makeup.get('eyeshadow', '')}"
        )
    style_desc = "\n".join(s for s in (hair_line, makeup_lines) if s)

    targets = []
    if card.get("hair"):
        targets.append("헤어스타일")
    if card.get("makeup"):
        targets.append("메이크업")
    change_target = "과 ".join(targets)

    prompt = (
        "이 사람의 사진을 아래 스타일로 변경해주세요.\n\n"
        f"{style_desc}\n\n"
        "규칙:\n"
        "- 얼굴 형태, 피부톤, 이목구비는 원본과 동일하게 유지\n"
        f"- {change_target}만 자연스럽게 변경\n"
        "- 실제 사람처럼 현실적으로 표현\n"
        "- 출력 이미지 비율은 3:4 (세로가 긴 세로형)"
    )

    parts = [
        {"inlineData": {"mimeType": mime, "data": data}},
        {"text": prompt},
    ]
    raw = await _call_gemini(IMAGE_MODEL, parts)

    candidates = raw.get("candidates") or []
    if not candidates:
        raise GeminiError("이미지를 생성할 수 없습니다.")
    response_parts = (candidates[0].get("content") or {}).get("parts") or []
    image_part = next((p for p in response_parts if p.get("inlineData")), None)
    if not image_part:
        raise GeminiError("이미지를 생성할 수 없습니다.")
    inline = image_part["inlineData"]
    out_mime = inline.get("mimeType", "image/jpeg")
    out_data = inline["data"]
    return f"data:{out_mime};base64,{out_data}"
