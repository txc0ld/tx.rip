import { neon } from '@neondatabase/serverless';

// Lazily create the SQL client. If DATABASE_URL is missing (e.g. before you wire
// up Neon), the endpoint returns 503 and the front-end falls back to localStorage.
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

export default async function handler(req, res) {
  if (!sql) return res.status(503).json({ error: 'DATABASE_URL not configured' });

  try {
    // ---- GET: top scores for the current calendar month ----
    if (req.method === 'GET') {
      const rows = await sql`
        select username, score, stars, accuracy, time_ms, clicks, hits, created_at
        from scores
        where created_at >= date_trunc('month', now() at time zone 'utc')
        order by score desc, time_ms asc
        limit 20`;
      res.setHeader('cache-control', 'no-store');
      return res.status(200).json(rows);
    }

    // ---- POST: submit a score ----
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

      const username = String(b.username || '').trim().slice(0, 24);
      const email    = String(b.email || '').trim().slice(0, 120);
      const score    = clampInt(b.score, 0, 1e9);
      const stars    = clampInt(b.stars, 0, 5);
      const accuracy = clampNum(b.accuracy, 0, 1);
      const timeMs   = clampInt(b.timeMs, 0, 1e9);
      const clicks   = clampInt(b.clicks, 0, 1e7);
      const hits     = clampInt(b.hits, 0, 1e7);

      if (username.length < 2) return res.status(400).json({ error: 'invalid username' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'invalid email' });

      await sql`
        insert into scores (username, email, score, stars, accuracy, time_ms, clicks, hits)
        values (${username}, ${email}, ${score}, ${stars}, ${accuracy}, ${timeMs}, ${clicks}, ${hits})`;
      return res.status(201).json({ ok: true });
    }

    res.setHeader('allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('leaderboard error', err);
    return res.status(500).json({ error: 'server error' });
  }
}

function clampInt(v, lo, hi) { const n = Math.round(Number(v) || 0); return Math.max(lo, Math.min(hi, n)); }
function clampNum(v, lo, hi) { const n = Number(v) || 0; return Math.max(lo, Math.min(hi, n)); }
