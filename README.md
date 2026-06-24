# tx.rip

Interactive starfield + pink "pop" game. Single static page (`index.html`) with a
serverless leaderboard backed by Neon Postgres.

## Layout

- `index.html` — the whole game/site (canvas, stats board, leaderboard modal). No build step.
- `api/leaderboard.js` — Vercel serverless function. `GET` returns this month's top scores; `POST` records a score.
- `schema.sql` — the `scores` table + indexes for Neon/Postgres.
- `package.json` — declares `@neondatabase/serverless` for the function.

## Deploy (Vercel)

1. Import `txc0ld/tx.rip` in Vercel. Framework preset: **Other** (no build command/output dir).
2. The static `index.html` serves at `/`; the function serves at `/api/leaderboard`.

The site works immediately even with no database — the leaderboard falls back to
`localStorage` until `DATABASE_URL` is set.

## Wire up the leaderboard (Neon)

1. Create a Neon project and copy the connection string.
2. Run the schema: `psql "$DATABASE_URL" -f schema.sql` (or paste it into Neon's SQL editor).
3. In Vercel → Project → Settings → Environment Variables, add `DATABASE_URL` (the Neon string), then redeploy.

That's it — the front-end already calls `/api/leaderboard`.

## Scoring

A round = clearing every pink glob (they split when popped). On clear, the page rates the round:

```
accuracy = hits / clicks
score    = round( hits * 100 * accuracy^1.5 - seconds * 4 )
stars    = blend( accuracy tier, seconds-per-pop tier ) -> 1..5
```

Tweak the constants in `computeScore()` inside `index.html` to reshape the board.

## Monthly prize

Emails are collected on submit. At month end, pick the winner:

```sql
select username, email, max(score) as best
from scores
where created_at >= date_trunc('month', now() at time zone 'utc')
group by username, email
order by best desc
limit 1;
```

Then email the prize out-of-band.
