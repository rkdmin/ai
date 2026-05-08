"""
AI 뷰티 코치 백엔드 진입점.
Phase 2: 프론트엔드의 Gemini 직접 호출을 모두 이 서버로 옮긴다.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import analyze, cards, photo
from services import mediapipe_service

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MediaPipe 모델은 첫 호출 때 다운로드/로드되면 응답 지연이 크다.
    # 서버 부팅 시 미리 로드해 첫 요청 레이턴시를 줄인다.
    mediapipe_service.warmup()
    yield


app = FastAPI(
    title="AI 뷰티 코치 API",
    version="0.2.0",
    lifespan=lifespan,
)

allowed_origins = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost,capacitor://localhost",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api")
app.include_router(cards.router, prefix="/api")
app.include_router(photo.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
