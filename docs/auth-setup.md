---
last-verified: "2026-08-12"
---

# Auth / Supabase Setup Notes

## Supabase

- Project URL: `https://plpvtuujthdefmbizbgc.supabase.co`
- Backend env:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` = Supabase `Publishable key`
  - `SUPABASE_SERVICE_ROLE_KEY` = Supabase `Secret key`
  - `SUPABASE_PHOTO_BUCKET=analysis-photos`
- Frontend env:
  - `VITE_SUPABASE_URL`
  - 현재 프론트는 `src/utils/authBridge.js` 로 OAuth redirect hash 를 읽어 세션을 복원함
- SQL applied:
  - `backend/supabase_schema.sql`
- Storage bucket:
  - `analysis-photos`
  - Public bucket
    - ⚠️ 저장되는 것은 **사용자 정면 얼굴 사진**(90일 보관)이다. Public bucket 은 URL 을 아는
      누구나 접근할 수 있다. 출시 전 private + signed URL 로 전환할지 결정이 필요하다.
      (`backend/services/supabase_service.py` 의 `upload_image_data_url` 이 업로드 담당)

## Supabase Auth

> 코드(`Login.jsx`)는 **Kakao 와 Google 둘 다** 지원한다 (`startOAuth('kakao')` / `startOAuth('google')`).
> 아래 Google 설정만 끝난 상태로는 **카카오 로그인 버튼이 실패한다.**

### Google

- Path: `Authentication > Sign In / Providers > Google`
- Google provider enabled.
- Supabase Google callback URL:
  - `https://plpvtuujthdefmbizbgc.supabase.co/auth/v1/callback`
- URL Configuration:
  - Site URL: `http://localhost:5173`
  - Redirect URLs:
    - `http://localhost:5173`
    - `http://127.0.0.1:5173`
  - 현재 코드 기준 OAuth 복귀 지점은 앱 루트(`/`)이며, 별도 `/login` 콜백 라우트는 사용하지 않음

### Kakao — **미설정**

- Path: `Authentication > Sign In / Providers > Kakao`
- 필요한 것: Kakao Developers 앱 생성 → REST API 키 / Client Secret 을 Supabase 에 등록,
  Kakao 쪽 Redirect URI 에 `https://plpvtuujthdefmbizbgc.supabase.co/auth/v1/callback` 추가.
- Android 실기기 PoC 가 별도로 필요하다 — 카카오톡 앱 설치 / 미설치 / 백그라운드 복귀 3케이스.
  (`docs/decisions/0004-phase3-auth-supabase.md` 의 "카카오 OAuth PoC" 절)

## Google Cloud

- Project: `beaume-496016`
- OAuth client type: `Web application`
- Authorized JavaScript origins:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- Authorized redirect URI:
  - `https://plpvtuujthdefmbizbgc.supabase.co/auth/v1/callback`

## Current App Behavior

- 로그인 시작은 `Login.jsx` 의 OAuth 버튼이 Supabase `/auth/v1/authorize` 로 이동시키는 방식
- 로그인 성공 후 앱은 URL hash 의 `access_token` 을 읽고 localStorage 세션으로 저장
- `history`, `my`, `history_detail` 진입 전 막힌 상태에서 로그인하면 `beaumi.auth.return_target` 을 사용해 원래 목적지로 복귀
- 로컬 개발에서 redirect URL 이 다르면 복귀는 되더라도 세션 복원이 실패할 수 있으니 `localhost:5173` 와 `127.0.0.1:5173` 둘 다 유지

Do not commit or paste API keys, client secrets, or service role keys.
