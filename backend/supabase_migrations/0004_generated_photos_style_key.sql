-- 0004 — 생성 사진 캐시를 "분석 + 카드 종류" 에서 "분석 + 카드 종류 + 스타일" 로 (plan 0009 P3 · F06, R12).
--
-- 배경: unique(analysis_id, card_type) 라서 헤어 추천 3개 중 어느 것으로 TRY ON 을 눌러도
-- 첫 합성 사진이 재사용됐다. style_key(스타일명·앞머리·rank 로 만든 slug)를 캐시 키에 넣는다.
-- 기존 행은 style_key='' 로 남고, 새 키로는 매치되지 않아 다시 생성된다 (의도된 1회 비용).

alter table public.generated_photos
  add column if not exists style_key text not null default '';

alter table public.generated_photos
  drop constraint if exists generated_photos_analysis_id_card_type_key;

create unique index if not exists generated_photos_analysis_card_style_key
  on public.generated_photos(analysis_id, card_type, style_key);
