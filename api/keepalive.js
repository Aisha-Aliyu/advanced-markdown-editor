// Free Supabase projects pause after about a week without enough database activity, and a
// paused project stops sign-in for everyone. Vercel calls this once a day (see "crons" in
// vercel.json). It runs a few small queries so the project keeps counting as in use. It can't
// wake a project that has already paused: that takes "Resume project" in the dashboard.
const QUERIES = [
  "documents?select=id&limit=1",
  "document_versions?select=id&limit=1",
  "documents?select=updated_at&order=updated_at.desc&limit=1",
];

export default async function handler(req, res) {
  // Vercel sends CRON_SECRET with its scheduled calls when that variable is set
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false });
  }

  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return res.status(500).json({ ok: false, reason: "Supabase settings are missing" });

  const statuses = [];
  for (const query of QUERIES) {
    try {
      // Row Level Security answers the public key with no rows, but each query still runs
      const response = await fetch(new URL(`/rest/v1/${query}`, url), {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(10000),
      });
      statuses.push(response.status);
    } catch (error) {
      statuses.push(error.name);
    }
  }
  const ok = statuses.every((status) => status === 200);
  return res.status(ok ? 200 : 502).json({ ok, statuses });
}
