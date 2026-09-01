-- ═══════════════════════════════════════════════════════════════
--  젤리모 · Supabase 한 번에 설정하기
--  Supabase 대시보드 → 왼쪽 SQL Editor → New query → 이 파일 전체를 붙여넣고 Run
--  여러 번 돌려도 안전합니다(있으면 넘어갑니다).
-- ═══════════════════════════════════════════════════════════════

-- ── ① 랭킹 표 ──────────────────────────────────────────────────
create table if not exists scores (
  id         bigserial primary key,
  created_at timestamptz default now(),
  name       text not null,
  score      int  not null,
  mode       text not null
);
alter table scores add column if not exists created_at timestamptz default now();
alter table scores add column if not exists ch  text;   -- 차림새(랭킹에 얼굴 띄우기)
alter table scores add column if not exists dur int;    -- 그 판을 몇 초 했나
alter table scores add column if not exists pop int;    -- 젤리를 몇 개 터트렸나
create index if not exists scores_board_idx on scores (mode, score desc);

-- ── ② 절대 불가능한 값 막기 ────────────────────────────────────
alter table scores drop constraint if exists scores_sane;
alter table scores add constraint scores_sane check (
  score >= 0 and score <= 2000000
  and (dur is null or (dur >= 0 and dur <= 7200))
  and (pop is null or (pop >= 0 and pop <= 100000))
  and char_length(name) between 1 and 10
  and char_length(mode) between 1 and 24
);

-- ── ③ 시간 대비 말이 안 되는 점수 · 도배 막기 ──────────────────
--    한계는 게임 코드에서 뽑았다: 젤리 하나 최대 26점 × 콤보 9 × 2배점수 3 = 702점,
--    가장 빠른 스폰 11프레임 → 초당 5.45개 → 초당 약 3,830점.
--    진짜 플레이어를 막으면 안 되니 1.5배(초당 6,000)로 잡는다.
create or replace function scores_guard() returns trigger
language plpgsql as $$
declare recent int;
begin
  if new.mode = 'fire_time' then
    -- 🔥 버티기 판은 값이 '점수'가 아니라 '초'다
    if new.score < 1 or new.score > 3600 then
      raise exception '버틴 시간이 말이 안 됩니다: %', new.score;
    end if;
    if new.dur is not null and abs(new.score - new.dur) > 1 then
      raise exception '버틴 시간과 판 길이가 다릅니다';
    end if;
  else
    if new.dur is null then
      if new.score > 300000 then
        raise exception '점수가 너무 큽니다: %', new.score;
      end if;
    else
      if new.score > 6000 * greatest(new.dur, 1) + 5000 then
        raise exception '% 초에 % 점은 나올 수 없습니다', new.dur, new.score;
      end if;
      if new.mode <> 'endless' and new.score > 300000 then
        raise exception '점수가 너무 큽니다: %', new.score;
      end if;
    end if;
    if new.dur is not null and new.pop is not null
       and new.pop > 6 * greatest(new.dur, 1) + 20 then
      raise exception '% 초에 % 개는 터트릴 수 없습니다', new.dur, new.pop;
    end if;
  end if;

  select count(*) into recent from scores
   where name = new.name and created_at > now() - interval '1 minute';
  if recent >= 10 then
    raise exception '너무 자주 올리고 있습니다';
  end if;
  return new;
end $$;

drop trigger if exists scores_guard_t on scores;
create trigger scores_guard_t before insert on scores
  for each row execute function scores_guard();

-- ── ④ 넣기만 되게 (남의 기록을 고치거나 지울 수 없게) ──────────
alter table scores enable row level security;
drop policy if exists scores_read  on scores;
drop policy if exists scores_write on scores;
drop policy if exists scores_edit  on scores;
drop policy if exists scores_del   on scores;
create policy scores_read  on scores for select using (true);
create policy scores_write on scores for insert with check (true);
-- update/delete 정책을 아예 안 만든다 = 아무도 못 고치고 못 지운다

-- ── ⑤ 💌 피드백 표 (게임 안 "만든 사람에게" 창) ────────────────
create table if not exists feedback (
  id         bigserial primary key,
  created_at timestamptz default now(),
  kind       text,          -- bug · want · hard · good
  text       text not null,
  name       text,
  ver        text,
  env        text
);
alter table feedback drop constraint if exists feedback_sane;
alter table feedback add constraint feedback_sane check (
  char_length(text) between 1 and 600
  and char_length(coalesce(name,'')) <= 10
  and char_length(coalesce(env,''))  <= 200
  and coalesce(kind,'') in ('bug','want','hard','good','')
);

create or replace function feedback_guard() returns trigger
language plpgsql as $$
declare recent int;
begin
  select count(*) into recent from feedback
   where coalesce(env,'') = coalesce(new.env,'')
     and created_at > now() - interval '1 minute';
  if recent >= 3 then raise exception '너무 자주 보내고 있습니다'; end if;
  return new;
end $$;

drop trigger if exists feedback_guard_t on feedback;
create trigger feedback_guard_t before insert on feedback
  for each row execute function feedback_guard();

alter table feedback enable row level security;
drop policy if exists feedback_write on feedback;
create policy feedback_write on feedback for insert with check (true);
-- select 정책을 일부러 안 만든다 = 대시보드(서비스 키)로만 읽힌다.
-- 남의 피드백을 아무나 읽을 수 있으면 사람들이 솔직하게 안 쓴다.

-- ═══════════════════════════════════════════════════════════════
--  끝. 아래는 '제대로 걸렸는지' 스스로 확인하는 것 — 같이 실행됩니다.
--  결과 표의 ok 칸이 전부 ✅ 여야 정상입니다.
-- ═══════════════════════════════════════════════════════════════
select 항목, ok from (values
  ('랭킹 지킴이(트리거)',
     (select case when count(*)=1 then '✅' else '❌' end from pg_trigger where tgname='scores_guard_t')),
  ('피드백 지킴이(트리거)',
     (select case when count(*)=1 then '✅' else '❌' end from pg_trigger where tgname='feedback_guard_t')),
  ('랭킹 RLS 켜짐',
     (select case when bool_or(relrowsecurity) then '✅' else '❌' end from pg_class where relname='scores')),
  ('피드백 RLS 켜짐',
     (select case when bool_or(relrowsecurity) then '✅' else '❌' end from pg_class where relname='feedback')),
  ('랭킹 수정·삭제 정책 없음',
     (select case when count(*)=0 then '✅' else '❌' end from pg_policies
       where tablename='scores' and cmd in ('UPDATE','DELETE'))),
  ('피드백 읽기 정책 없음',
     (select case when count(*)=0 then '✅' else '❌' end from pg_policies
       where tablename='feedback' and cmd='SELECT')),
  ('dur·pop·ch 칸 있음',
     (select case when count(*)=3 then '✅' else '❌' end from information_schema.columns
       where table_name='scores' and column_name in ('dur','pop','ch')))
) as v(항목, ok);
