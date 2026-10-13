// Public, non-secret settings the dashboard needs before sign-in. The Supabase
// anon/publishable key is designed to be public; access is enforced by the
// server-side role checks and database row-level security.
const { handler, send } = require("./_lib/http");
const { config } = require("./_lib/config");

module.exports = handler(["GET"], async (req, res) => {
  const cfg = config();
  send(res, 200, {
    supabaseUrl: cfg.supabaseUrl || null,
    supabaseAnonKey: cfg.supabaseAnonKey || null,
    siteUrl: cfg.siteUrl,
  });
});
