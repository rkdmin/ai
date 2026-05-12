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
- SQL applied:
  - `backend/supabase_schema.sql`
- Storage bucket:
  - `analysis-photos`
  - Public bucket

## Supabase Auth

- Path: `Authentication > Sign In / Providers > Google`
- Google provider enabled.
- Supabase Google callback URL:
  - `https://plpvtuujthdefmbizbgc.supabase.co/auth/v1/callback`
- URL Configuration:
  - Site URL: `http://localhost:5173`
  - Redirect URLs:
    - `http://localhost:5173`
    - `http://127.0.0.1:5173`

## Google Cloud

- Project: `beaume-496016`
- OAuth client type: `Web application`
- Authorized JavaScript origins:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- Authorized redirect URI:
  - `https://plpvtuujthdefmbizbgc.supabase.co/auth/v1/callback`

Do not commit or paste API keys, client secrets, or service role keys.
