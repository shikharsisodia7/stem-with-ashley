// Who am I? Confirms the signed-in account has dashboard access and reports which
// server features are connected.
const { handler, send } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { config } = require("./_lib/config");

module.exports = handler(["GET"], async (req, res) => {
  const { user, role, email } = await requireUser(req);
  const cfg = config();
  send(res, 200, {
    id: user.id,
    email,
    role,
    lastSignIn: user.last_sign_in_at || null,
    features: {
      publishing: Boolean(cfg.githubToken),
      teamManagement: Boolean(cfg.supabaseServiceKey),
    },
    siteUrl: cfg.siteUrl,
  });
});
