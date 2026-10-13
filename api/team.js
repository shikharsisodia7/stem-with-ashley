// Team access (dashboard administrators only).
// GET  -> list accounts and their dashboard role
// POST { action: "invite", email, role }  -> create the account (if needed), give it
//        a role, and return a one-time setup link to send to that person
// POST { action: "link", email }          -> one-time "set a new password" link
// POST { action: "setRole", userId, role } -> change or remove ("none") access
//
// Setup links are generated with Supabase's admin API and contain a single-use
// token — no password is ever created, stored, or emailed by this code.

const { handler, send, readJson, HttpError } = require("./_lib/http");
const { requireUser } = require("./_lib/auth");
const { db, rateLimit } = require("./_lib/db");
const { config } = require("./_lib/config");

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const ROLE_VALUES = ["admin", "editor", "none"];

function adminApi() {
  const cfg = config();
  if (!cfg.supabaseServiceKey) {
    throw new HttpError(503, "Team management isn't connected yet on the server (missing Supabase service key). Ask Shikhar to finish setup.");
  }
  const base = `${cfg.supabaseUrl}/auth/v1/admin`;
  return async function call(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        apikey: cfg.supabaseServiceKey,
        Authorization: `Bearer ${cfg.supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new HttpError(502, (data && (data.msg || data.message || data.error_description)) || "The sign-in service rejected that request.");
      err.authStatus = res.status;
      throw err;
    }
    return data;
  };
}

function setupLink(hashedToken, type) {
  const cfg = config();
  return `${cfg.siteUrl}/admin/?setup=${encodeURIComponent(hashedToken)}&type=${type}`;
}

function linkFields(r) {
  const props = (r && r.properties) || r || {};
  return { hashedToken: props.hashed_token, userId: (r && (r.id || (r.user && r.user.id))) || null };
}

async function findUserByEmail(call, email) {
  const list = await call("GET", "/users?page=1&per_page=1000");
  return (list.users || []).find((u) => (u.email || "").toLowerCase() === email) || null;
}

module.exports = handler(["GET", "POST"], async (req, res) => {
  const me = await requireUser(req, { role: "admin" });
  const call = adminApi();
  const database = db(me.token);

  if (req.method === "GET") {
    const list = await call("GET", "/users?page=1&per_page=1000");
    const users = (list.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      role: (u.app_metadata && u.app_metadata.cms_role) || "none",
      lastSignIn: u.last_sign_in_at || null,
      createdAt: u.created_at,
      passwordSet: Boolean(u.last_sign_in_at || u.confirmed_at),
    }));
    return send(res, 200, { users });
  }

  const body = await readJson(req);
  await rateLimit(database, "team", me.email, 40);

  if (body.action === "invite" || body.action === "link") {
    const email = String(body.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address.");
    const role = body.action === "invite" ? body.role : null;
    if (body.action === "invite" && !["admin", "editor"].includes(role)) throw new HttpError(400, "Choose a role.");

    let existing = await findUserByEmail(call, email);
    let type = "recovery";
    let generated;
    if (!existing) {
      if (body.action === "link") throw new HttpError(404, "There's no account with that email yet. Use \"Invite someone\" instead.");
      generated = await call("POST", "/generate_link", { type: "invite", email });
      type = "invite";
      existing = { id: linkFields(generated).userId };
    } else {
      generated = await call("POST", "/generate_link", { type: "recovery", email });
    }
    const { hashedToken } = linkFields(generated);
    if (!hashedToken || !existing.id) throw new HttpError(502, "The sign-in service didn't return a setup link. Please try again.");
    if (role) await call("PUT", `/users/${existing.id}`, { app_metadata: { cms_role: role } });
    await database.audit(`team_${body.action}`, true, { email, role, linkType: type });
    return send(res, 200, { ok: true, email, linkType: type, link: setupLink(hashedToken, type) });
  }

  if (body.action === "setRole") {
    const role = body.role;
    if (!ROLE_VALUES.includes(role)) throw new HttpError(400, "Choose a valid role.");
    if (!/^[0-9a-f-]{36}$/.test(String(body.userId || ""))) throw new HttpError(400, "Unknown account.");
    if (body.userId === me.user.id && role !== "admin") throw new HttpError(400, "You can't remove your own administrator access.");
    const updated = await call("PUT", `/users/${body.userId}`, { app_metadata: { cms_role: role === "none" ? null : role } });
    await database.audit("team_set_role", true, { email: updated.email, role });
    return send(res, 200, { ok: true });
  }

  throw new HttpError(400, "Unknown action.");
});
