FROM python:3.11-slim

# MediaPipe + OpenCV 런타임 의존성
# - libgles2: libGLESv2.so.2 (Render native Python 에서 빠진 그 라이브러리)
# - libgl1, libegl1: OpenGL 데스크톱/EGL
# - libglib2.0-0, libsm6, libxext6, libxrender1: opencv 호환 X11 stubs
# - libgomp1: numpy/opencv OpenMP
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libgles2 \
    libegl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Render 가 PORT 를 주입한다.
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
