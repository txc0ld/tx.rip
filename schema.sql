-- Neon / Postgres schema for the tx.rip pop-game leaderboard.
-- Run once against your database (Neon SQL editor or psql):
--   psql "$DATABASE_URL" -f schema.sql

create table if not exists scores (
  id          bigint generated always as identity primary key,
  username    text        not null,
  email       text        not null,
  score       integer     not null default 0,
  stars       smallint    not null default 0,
  accuracy    real        not null default 0,   -- 0..1
  time_ms     integer     not null default 0,
  clicks      integer     not null default 0,
  hits        integer     not null default 0,
  created_at  timestamptz not null default now()
);

-- Fast "top of the month" reads.
create index if not exists scores_score_idx on scores (score desc, time_ms asc);
create index if not exists scores_created_idx on scores (created_at);

-- Monthly winner pick (run at month end to email a prize):
--   select username, email, max(score) as best
--   from scores
--   where created_at >= date_trunc('month', now() at time zone 'utc')
--   group by username, email
--   order by best desc
--   limit 1;
