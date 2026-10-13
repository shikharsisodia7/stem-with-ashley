// In-memory stand-in for the parts of Supabase the admin API calls:
//   GET  /auth/v1/user                     (token -> user)
//   /auth/v1/admin/users, /generate_link   (service-key admin API)
//   /rest/v1/cms_drafts | cms_publications | cms_audit | rpc/cms_ping
// Row-level security is imitated: table access requires a token whose user has
// app_metadata.cms_role of admin/editor. Used only by the automated API tests.

const http = require("node:http");
const crypto = require("node:crypto");

function createFakeSupabase({ anonKey = "anon-key", serviceKey = "service-key" } = {}) {
  const users = new Map();  // id -> user
  const tokens = new Map(); // token -> user id
  const tables = { cms_drafts: [], cms_publications: [], cms_audit: [] };
  let seq = 1;
  const calls = [];

  function addUser(email, role) {
    const id = crypto.randomUUID();
    const user = { id, email, app_metadata: role ? { cms_role: role } : {}, created_at: new Date().toISOString(), last_sign_in_at: null };
    users.set(id, user);
    const token = `tok-${crypto.randomBytes(8).toString("hex")}`;
    tokens.set(token, id);
    return { user, token };
  }

  function json(res, status, body) {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(body === undefined ? "" : JSON.stringify(body));
  }

  function userFor(req) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!m) return null;
    const id = tokens.get(m[1]);
    return id ? users.get(id) : null;
  }

  function filters(url) {
    const out = [];
    url.searchParams.forEach((v, k) => {
      const m = /^(eq|neq|gte)\.(.*)$/.exec(v);
      if (m) out.push({ col: k, op: m[1], val: m[2] });
    });
    return out;
  }
  const match = (row, fs) => fs.every((f) => (f.op === "eq" ? String(row[f.col]) === f.val
    : f.op === "neq" ? String(row[f.col]) !== f.val : String(row[f.col]) >= f.val));

  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw ? JSON.parse(raw) : null;
    const url = new URL(req.url, "http://fake");
    const p = url.pathname;
    calls.push({ method: req.method, path: p });

    if (req.headers.apikey !== anonKey && req.headers.apikey !== serviceKey) return json(res, 401, { message: "Invalid API key" });

    // ---- Admin API (service key only)
    if (p.startsWith("/auth/v1/admin/")) {
      if (req.headers.authorization !== `Bearer ${serviceKey}`) return json(res, 403, { msg: "not admin" });
      if (req.method === "GET" && p === "/auth/v1/admin/users") return json(res, 200, { users: [...users.values()] });
      if (req.method === "POST" && p === "/auth/v1/admin/generate_link") {
        let u = [...users.values()].find((x) => x.email === body.email);
        if (body.type === "invite") {
          if (u) return json(res, 422, { msg: "A user with this email address has already been registered" });
          u = addUser(body.email, null).user;
        } else if (!u) return json(res, 404, { msg: "User not found" });
        return json(res, 200, { id: u.id, email: u.email, properties: { hashed_token: crypto.randomBytes(16).toString("hex"), verification_type: body.type } });
      }
      const m = /^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(p);
      if (req.method === "PUT" && m) {
        const u = users.get(m[1]);
        if (!u) return json(res, 404, { msg: "not found" });
        if (body.app_metadata) u.app_metadata = { ...u.app_metadata, ...body.app_metadata };
        return json(res, 200, u);
      }
      return json(res, 404, { msg: "unsupported" });
    }

    if (p === "/auth/v1/user") {
      const u = userFor(req);
      return u ? json(res, 200, u) : json(res, 401, { msg: "invalid JWT" });
    }

    if (p === "/rest/v1/rpc/cms_ping") return json(res, 200, 1);

    const t = /^\/rest\/v1\/(cms_[a-z]+)$/.exec(p);
    if (t && tables[t[1]]) {
      const u = userFor(req);
      const role = u && u.app_metadata && u.app_metadata.cms_role;
      if (!u) return json(res, 401, { message: "JWT expired" });
      // Imitate RLS: rows invisible / writes rejected without an editor role.
      const allowed = role === "admin" || role === "editor";
      const rows = tables[t[1]];
      const fs = filters(url);
      if (req.method === "GET") return json(res, 200, allowed ? rows.filter((r) => match(r, fs)) : []);
      if (!allowed) return json(res, 403, { message: "new row violates row-level security policy" });
      if (req.method === "POST") {
        const now = new Date(Date.now() + seq).toISOString();
        if (t[1] === "cms_drafts") {
          const existing = rows.find((r) => r.doc === body.doc);
          const row = { ...body, updated_by: u.email, updated_at: now };
          if (existing) Object.assign(existing, row); else rows.push(row);
          seq += 1;
          return json(res, 201, [existing || row]);
        }
        const row = { id: seq++, ...body, created_at: now, ...(t[1] === "cms_audit" ? { actor: u.email } : { published_by: u.email }) };
        rows.push(row);
        return json(res, 201, [row]);
      }
      if (req.method === "DELETE") {
        const gone = rows.filter((r) => match(r, fs));
        tables[t[1]] = rows.filter((r) => !match(r, fs));
        return json(res, 200, gone);
      }
    }
    return json(res, 404, { message: `Fake Supabase: unsupported ${req.method} ${p}` });
  });

  return { server, users, tokens, tables, calls, addUser, anonKey, serviceKey };
}

module.exports = { createFakeSupabase };
