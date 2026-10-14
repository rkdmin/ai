-- 0002 — analyses 에 결과 원형 JSON + 모양 버전 + 무드를 추가한다 (plan 0009 P1 · D04).
--
-- 배경: v1 은 face_type/features 컬럼만 저장해 저장된 분석을 다시 열면 무드가 빈 배열이었다.
-- 이제 응답 JSON 을 result 에 그대로 두고 schema_version 으로 모양을 표시한다.
-- 기존 행은 schema_version=1, result=null 로 남는다. 백엔드 analysis_from_row 가 legacy 로 읽는다.
-- 구버전 행을 새 모양으로 채워 넣는 UPDATE 를 여기서 하지 않는다 — 저장하지 않은 값은 없는 값이다.
--
-- 적용: Supabase SQL Editor 에서 실행. 새 프로젝트는 supabase_schema.sql 만 적용하면 된다 (이미 반영됨).

alter table public.analyses
  add column if not exists result jsonb,
  add column if not exists schema_version int not null default 1,
  add column if not exists mood_archetype text[] not null default '{}';

comment on column public.analyses.result is
  '분석 응답 JSON 원형 (faceRatios·faceTypeReason 제외). schema_version 이 모양을 말한다.';
comment on column public.analyses.schema_version is
  '1 = 컬럼만(무드 없음, 2026-10 이전) · 2 = result JSON + mood_archetype. 백엔드 ANALYSIS_SCHEMA_VERSION 과 같이 올린다.';
comment on column public.analyses.mood_archetype is
  '무드 아키타입 8개 키워드 중 3개. 목록 조회용 (result 에도 같은 값이 있다).';
