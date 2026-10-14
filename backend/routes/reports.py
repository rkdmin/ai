"""
통합 Beauty Report API (plan 0009 P3 · F04). 전부 로그인 전용.

POST /api/reports                 — 분석 ID 로 리포트를 만들고 Hair·Makeup 을 생성 (멱등)
GET  /api/reports                 — 내 리포트 목록 (권한 없으면 본문 없이 locked=true)
GET  /api/reports/{id}            — 리포트 하나
POST /api/reports/{id}/retry      — 실패한 탭만 재생성

구매 검증은 P4. 그 전까지는 REPORT_ACCESS_MODE 가 권한을 정한다 (report_service 참조).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from middleware import rate_limit
from middleware.auth import Principal, require_user
from models.schemas import ReportCreateRequest, ReportResponse
from services import report_service

router = APIRouter()


@router.post("/reports", response_model=ReportResponse)
async def create_report(body: ReportCreateRequest, request: Request, principal: Principal = Depends(require_user)):
    rate_limit.consume("reports", principal, request)
    row = await report_service.create_report(principal.user_id, body.analysisId)
    return report_service.to_response(row, unlocked=True)


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(principal: Principal = Depends(require_user)):
    return await report_service.list_reports(principal.user_id)


@router.get("/reports/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, principal: Principal = Depends(require_user)):
    return await report_service.get_report(principal.user_id, report_id)


@router.post("/reports/{report_id}/retry", response_model=ReportResponse)
async def retry_report(report_id: str, request: Request, principal: Principal = Depends(require_user)):
    rate_limit.consume("reports", principal, request)
    row = await report_service.retry_report(principal.user_id, report_id)
    return report_service.to_response(row, unlocked=True)
