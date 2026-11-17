// Free Supabase projects pause after about a week without use, and a paused project
// stops sign-in for everyone. Vercel calls this once a day (see "crons" in vercel.json),
// and it runs one small database query so the project always counts as in use.
export default async function handler(req, res) {
  // Vercel sends CRON_SECRET with its scheduled calls when that variable is set
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ ok: false, reason: "Supabase settings are missing" });

  try {
    // Row Level Security answers the public key with no rows, but the query still runs
    const response = await fetch(`${url}/rest/v1/documents?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    return res.status(response.ok ? 200 : 502).json({ ok: response.ok, status: response.status });
  } catch (error) {
    return res.status(502).json({ ok: false, reason: error.message });
  }
}
