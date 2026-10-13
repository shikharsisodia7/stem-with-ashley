// Daily Vercel cron (see vercel.json). Free Supabase projects pause after a week
// without activity, which would stop Ashley from signing in; one tiny query a day
// keeps it awake. Vercel sends "Authorization: Bearer $CRON_SECRET" to crons.
const { handler, send, HttpError } = require("./_lib/http");
const { config } = require("./_lib/config");

module.exports = handler(["GET"], async (req, res) => {
  const cfg = config();
  if (!cfg.cronSecret || req.headers.authorization !== `Bearer ${cfg.cronSecret}`) {
    throw new HttpError(401, "Unauthorized.");
  }
  const r = await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/cms_ping`, {
    method: "POST",
    headers: { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}`, "Content-Type": "application/json" },
    body: "{}",
  });
  send(res, r.ok ? 200 : 502, { ok: r.ok });
});
